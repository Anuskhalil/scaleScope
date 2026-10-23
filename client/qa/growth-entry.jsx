import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import GrowthSignalPanel from '../src/components/GrowthSignalPanel';
import '../src/index.css';
const params = new URLSearchParams(location.search);
const role = params.get('role') || 'early-stage-founder';
const profile = { id: params.get('other') ? 'another-user' : 'test-user', user_type: role, bio:'Building a useful service for customers.', location:'Karachi' };
const founderProfile = { startup_stage: params.get('stage') || 'Building MVP', company_name:'Example startup', industry:'EdTech',
  solution_description:'A better way to find complementary partners.', problem_statement:'Founders struggle to find partners with complementary skills.',
  target_market:'Early founders', founder_skills:['Design','Sales','Engineering'], looking_for:['Co-Founder','Investor'],
  metadata:{founder_background:'student',fundraising_status:'planning'} };
const investorProfile = {investor_type:'Angel',accepting_pitches:false};
createRoot(document.getElementById('root')).render(<MemoryRouter><main className="mx-auto max-w-4xl p-3"><GrowthSignalPanel profile={profile} founderProfile={founderProfile} investorProfile={investorProfile} role={role} enableAI compact /></main></MemoryRouter>);

