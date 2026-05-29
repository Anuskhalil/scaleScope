const supabase = require('../config/supabase');
const gemini = require('../config/gemini');

const AUTO_REPLY_RECENT_AI_WINDOW_MS = Number(process.env.AUTO_REPLY_RECENT_AI_WINDOW_MS || 5 * 60 * 1000);
const AUTO_REPLY_RECENT_HUMAN_WINDOW_MS = Number(process.env.AUTO_REPLY_RECENT_HUMAN_WINDOW_MS || 2 * 60 * 1000);

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

exports.createMessage = async (convId, senderId, content) => {
    if (!convId) throw new Error('conversation id is required');
    if (!senderId) throw new Error('sender id is required');
    if (!content?.trim()) throw new Error('message content is required');
    if (content.trim().length > 2000) throw new Error('message content is too long');

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
      created_at,
      updated_at
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
        const { receiverOnline = false, isReceiverOnline } = options;

        if (!msg?.content) return null;

        // If receiver is online, let the real user reply manually
        if (receiverOnline) {
            console.log('ðŸ¤– AI reply skipped: receiver is online');
            return null;
        }

        const senderId = msg.sender_id;
        const receiverId = await getOtherParticipant(convId, senderId);

        if (!receiverId) {
            console.warn('ðŸ¤– AI reply skipped: receiver not found');
            return null;
        }

        if (typeof isReceiverOnline === 'function' && isReceiverOnline(receiverId)) {
            console.log('AI reply skipped: receiver came online');
            return null;
        }

        // Do not auto-reply too frequently
        const recentAiWindow = new Date(Date.now() - AUTO_REPLY_RECENT_AI_WINDOW_MS).toISOString();

        const { count: recentAiCount, error: recentAiError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('sender_id', receiverId)
            .eq('is_ai_generated', true)
            .gte('created_at', recentAiWindow);

        if (recentAiError) throw recentAiError;

        if ((recentAiCount || 0) > 0) {
            console.log('ðŸ¤– AI reply skipped: recent auto-reply already exists');
            return null;
        }

        // If receiver recently replied manually, no AI needed
        const recentHumanWindow = new Date(Date.now() - AUTO_REPLY_RECENT_HUMAN_WINDOW_MS).toISOString();

        const { count: recentHumanCount, error: recentHumanError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('sender_id', receiverId)
            .eq('is_ai_generated', false)
            .gte('created_at', recentHumanWindow);

        if (recentHumanError) throw recentHumanError;

        if ((recentHumanCount || 0) > 0) {
            console.log('ðŸ¤– AI reply skipped: receiver recently replied manually');
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
        let receiverFounderProfile = null;

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

        if (receiverProfile?.user_type === 'early-stage-founder') {
            const { data, error } = await supabase
                .from('founder_profiles')
                .select(`
            company_name,
            idea_title,
            industry,
            startup_stage,
            problem_statement,
            solution_description,
            unique_value_proposition,
            target_market,
            founder_role,
            help_needed,
            skills_needed,
            hiring_roles,
            funding_stage,
            product_status,
            current_challenges
          `)
                .eq('user_id', receiverId)
                .maybeSingle();

            if (!error) {
                receiverFounderProfile = data;
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

        const profileContext = {
            basic: {
                name: receiverName,
                role: receiverProfile?.user_type || 'user',
                bio: receiverProfile?.bio || null,
                location: receiverProfile?.location || null,
            },
            student: receiverStudentProfile || null,
            founder: receiverFounderProfile || null,
        };

        const prompt = `
You are ScaleScope's availability assistant for ${receiverName}.
${receiverName} is unavailable right now, so you are helping keep the conversation warm until they return.

Rules:
- Do not pretend to be ${receiverName}.
- Do not write in first person as ${receiverName}.
- Make it clear, naturally, that this is an auto-reply while ${receiverName} is away.
- Reply like a helpful human assistant, not a chatbot.
- Be warm, concise, and natural.
- Acknowledge ${senderName}'s latest message directly.
- Use the receiver profile only when it is relevant.
- Ask one simple next question if it helps ${receiverName} reply later.
- Keep it under 55 words.
- Do not promise meetings, funding, investment, acceptance, partnership, hiring, or exact response times.
- Do not invent sensitive/private details.
- Avoid phrases like "as an AI", "I am a bot", or formal customer-support wording.

Receiver profile context:
${JSON.stringify(profileContext, null, 2)}

Recent conversation:
${conversationHistory}

Latest message from ${senderName}:
"${msg.content}"

Write only the auto-reply text:
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
            .replace(/^ScaleScope Auto-Reply:\s*/i, '')
            .replace(/^ScaleScope Assistant:\s*/i, '')
            .replace(/^Usman Ali Shah:\s*/i, '')
            .replace(/^User:\s*/i, '')
            .trim();

        if (!aiText) return null;

        // Avoid ultra-short weak replies like "Hey!"
        if (aiText.split(/\s+/).length < 5) {
            aiText = `Hey ${senderName.split(' ')[0]}, ${receiverName} is away right now. You can share what you would like to discuss, and they can continue when they are back.`;
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
