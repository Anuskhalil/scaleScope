const supabase = require('../config/supabase');
const gemini = require('../config/gemini');

async function getOtherParticipant(conversationId, senderId) {
    const { data, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);

    if (error) throw error;

    return (data || []).find((participant) => {
        return participant.user_id !== senderId;
    })?.user_id || null;
}

function looksLikeQuestion(content = '') {
    const text = content.trim();

    if (!text) return false;

    return (
        text.includes('?') ||
        /^(hi|hello|hey|can|could|would|what|why|how|when|where|are|is|do|does|did|will|should)\b/i.test(text)
    );
}

exports.createMessage = async (convId, senderId, content) => {
    if (!convId) throw new Error('conversation id is required');
    if (!senderId) throw new Error('sender id is required');
    if (!content?.trim()) throw new Error('message content is required');

    const { data: membership, error: membershipError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('conversation_id', convId)
        .eq('user_id', senderId)
        .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) throw new Error('You are not a participant in this conversation');

    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: convId,
            sender_id: senderId,
            content: content.trim(),
            type: 'text',
            is_ai_generated: false,
            created_at: now,
        })
        .select(`
      id,
      conversation_id,
      sender_id,
      content,
      type,
      file_url,
      file_name,
      file_size,
      is_ai_generated,
      created_at
    `)
        .single();

    if (error) throw error;

    await supabase
        .from('conversations')
        .update({
            last_message_at: now,
            updated_at: now,
        })
        .eq('id', convId);

    return data;
};

exports.triggerAIReply = async (msg, convId, options = {}) => {
    try {
        const { receiverOnline = false } = options;

        if (!msg?.content) return null;

        // If receiver is online, let the real user reply manually
        if (receiverOnline) {
            console.log('🤖 AI reply skipped: receiver is online');
            return null;
        }

        const senderId = msg.sender_id;
        const receiverId = await getOtherParticipant(convId, senderId);

        if (!receiverId) {
            console.warn('🤖 AI reply skipped: receiver not found');
            return null;
        }

        // Do not auto-reply too frequently
        const recentWindow = new Date(Date.now() - 45 * 1000).toISOString();

        const { count: recentAiCount, error: recentAiError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('sender_id', receiverId)
            .eq('is_ai_generated', true)
            .gte('created_at', recentWindow);

        if (recentAiError) throw recentAiError;

        if ((recentAiCount || 0) > 0) {
            console.log('🤖 AI reply skipped: recent auto-reply already exists');
            return null;
        }

        // If receiver recently replied manually, no AI needed
        const { count: recentHumanCount, error: recentHumanError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('sender_id', receiverId)
            .eq('is_ai_generated', false)
            .gte('created_at', recentWindow);

        if (recentHumanError) throw recentHumanError;

        if ((recentHumanCount || 0) > 0) {
            console.log('🤖 AI reply skipped: receiver recently replied manually');
            return null;
        }

        // Fetch sender and receiver profiles
        const { data: receiverProfile, error: receiverProfileError } = await supabase
            .from('profiles')
            .select('id, full_name, bio, user_type, location')
            .eq('id', receiverId)
            .maybeSingle();

        if (receiverProfileError) throw receiverProfileError;

        const { data: senderProfile, error: senderProfileError } = await supabase
            .from('profiles')
            .select('id, full_name, user_type')
            .eq('id', senderId)
            .maybeSingle();

        if (senderProfileError) throw senderProfileError;

        let receiverStudentProfile = null;

        if (receiverProfile?.user_type === 'student') {
            const { data, error } = await supabase
                .from('student_profiles')
                .select(`
            university,
            degree,
            major,
            idea_title,
            idea_domain,
            startup_idea_description,
            target_audience,
            unique_value_prop,
            skills_with_levels,
            commitment_level,
            help_needed
          `)
                .eq('user_id', receiverId)
                .maybeSingle();

            if (!error) {
                receiverStudentProfile = data;
            }
        }

        // Fetch recent conversation history for natural flow
        const { data: recentMessages, error: historyError } = await supabase
            .from('messages')
            .select('sender_id, content, created_at, is_ai_generated')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(12);

        if (historyError) throw historyError;

        const chronologicalMessages = (recentMessages || []).reverse();

        const conversationHistory = chronologicalMessages
            .map((m) => {
                const speaker =
                    m.sender_id === receiverId
                        ? receiverProfile?.full_name || 'Receiver'
                        : senderProfile?.full_name || 'Sender';

                const aiTag = m.is_ai_generated ? ' (auto-reply)' : '';

                return `${speaker}${aiTag}: ${m.content}`;
            })
            .join('\n');

        const senderName = senderProfile?.full_name || 'there';
        const receiverName = receiverProfile?.full_name || 'User';

        const prompt = `
  You are writing an auto-reply on behalf of ${receiverName}, who is currently offline.
  
  Important:
  - Speak as ${receiverName}, in first person.
  - Do NOT say you are AI.
  - Do NOT say "AI auto-reply".
  - Be natural, helpful, and human-friendly.
  - Continue the conversation based on the recent chat history.
  - Answer the latest message directly.
  - Mention that you are currently away/busy only briefly.
  - Ask one relevant follow-up question if useful.
  - Keep it under 45 words.
  - Do not make fixed commitments like exact meeting times unless already mentioned by the user.
  - Do not invent sensitive/private details.
  - If the sender asks about startup idea, respond using the available startup context.
  
  Receiver profile:
  Name: ${receiverName}
  Role: ${receiverProfile?.user_type || 'user'}
  Bio: ${receiverProfile?.bio || 'Not provided'}
  Location: ${receiverProfile?.location || 'Not provided'}
  University: ${receiverStudentProfile?.university || 'Not provided'}
  Degree/Major: ${[receiverStudentProfile?.degree, receiverStudentProfile?.major].filter(Boolean).join(' / ') || 'Not provided'}
  Startup idea title: ${receiverStudentProfile?.idea_title || 'Not provided'}
  Startup domain: ${receiverStudentProfile?.idea_domain || 'Not provided'}
  Startup description: ${receiverStudentProfile?.startup_idea_description || 'Not provided'}
  Target audience: ${receiverStudentProfile?.target_audience || 'Not provided'}
  Unique value proposition: ${receiverStudentProfile?.unique_value_prop || 'Not provided'}
  Commitment level: ${receiverStudentProfile?.commitment_level || 'Not provided'}
  Help needed: ${Array.isArray(receiverStudentProfile?.help_needed) ? receiverStudentProfile.help_needed.join(', ') : receiverStudentProfile?.help_needed || 'Not provided'}
  
  Sender:
  Name: ${senderName}
  
  Recent conversation:
  ${conversationHistory}
  
  Latest message from ${senderName}:
  "${msg.content}"
  
  Write ${receiverName}'s auto-reply:
  `;

        const model = gemini.getGeminiModel({
            maxTokens: 120,
            temperature: 0.65,
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;

        let aiText = response.text().trim().replace(/^"|"$/g, '');

        // Safety cleanup
        aiText = aiText
            .replace(/^AI Auto-Reply:\s*/i, '')
            .replace(/^Auto-reply:\s*/i, '')
            .replace(/^Usman Ali Shah:\s*/i, '')
            .replace(/^User:\s*/i, '')
            .trim();

        if (!aiText) return null;

        // Avoid ultra-short weak replies like "Hey!"
        if (aiText.split(/\s+/).length < 5) {
            aiText = `Hey ${senderName.split(' ')[0]}, I’m away right now but yes, we can discuss it. Which part would you like to start with?`;
        }

        const now = new Date().toISOString();

        const { data: aiMsg, error: aiError } = await supabase
            .from('messages')
            .insert({
                conversation_id: convId,
                sender_id: receiverId,
                content: aiText,
                type: 'text',
                is_ai_generated: true,
                created_at: now,
            })
            .select(`
          id,
          conversation_id,
          sender_id,
          content,
          type,
          file_url,
          file_name,
          file_size,
          is_ai_generated,
          created_at
        `)
            .single();

        if (aiError) throw aiError;

        await supabase
            .from('conversations')
            .update({
                last_message_at: now,
                updated_at: now,
            })
            .eq('id', convId);

        return aiMsg;
    } catch (err) {
        console.error('Gemini auto-reply error:', err);
        return null;
    }
};