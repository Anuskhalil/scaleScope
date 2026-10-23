import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import AdminReviewPage from '../src/pages/AdminReviewPage';
import ProfileReviewGate from '../src/components/ProfileReviewGate';
import ProfileReviewStatus from '../src/components/ProfileReviewStatus';
import '../src/index.css';
createRoot(document.getElementById('root')).render(<BrowserRouter><ProfileReviewStatus/><p data-testid="suggestions">Personalized recommendations</p><ProfileReviewGate><p data-testid="protected-action">Profile details and messages</p></ProfileReviewGate><AdminReviewPage/></BrowserRouter>);
