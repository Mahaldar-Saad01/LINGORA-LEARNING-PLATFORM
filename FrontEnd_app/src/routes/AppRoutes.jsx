import { useEffect } from "react";
import { BrowserRouter,Routes,Route,useLocation } from "react-router-dom";

import Landing from "../pages/landing.jsx";
import Dashboard from "../pages/dashboard.jsx";
import Assessment from "../pages/Assessment.jsx";
import Login from "../pages/login.jsx";
import Register from "../pages/register.jsx";
import Lessons from "../pages/lessons.jsx";
import Profile from "../pages/profile.jsx";
import LessonJourneyPage from "../pages/lessons/LessonJourneyPage.jsx";
import LearningInsightsPage from "../pages/LearningInsightsPage.jsx";
import AssessmentsPage from "../pages/assessments/AssessmentsPage.jsx";
import AssessmentTakingPage from "../pages/assessments/AssessmentTakingPage.jsx";
import AssessmentResultsPage from "../pages/assessments/AssessmentResultsPage.jsx";
import BadgesPage from "../pages/assessments/BadgesPage.jsx";
import TutorPage from "../pages/TutorPage.jsx";
import CommunityPage from "../pages/CommunityPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import FloatingAITutor from "../components/FloatingAITutor.jsx";

function StopSpeechOnNavigation(){
    const location = useLocation();

    useEffect(() => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    }, [location.pathname, location.search, location.hash]);

    return null;
}


function AppRoutes(){
    return(
        <BrowserRouter>
            <StopSpeechOnNavigation />
            <FloatingAITutor />
            <Routes>
                <Route path="/" element={<Landing/>}/>
                <Route path="/dashboard" element={<Dashboard/>}/>
                <Route path="/community" element={<CommunityPage/>}/>
                <Route path="/settings" element={<SettingsPage/>}/>
                <Route path="/tutor" element={<TutorPage/>}/>
                <Route path="/ai-tutor" element={<TutorPage/>}/>
                <Route path="/assessment" element={<Assessment/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/lessons" element={<Lessons/>}/>
                <Route path="/lessons/:lessonId" element={<LessonJourneyPage/>}/>
                <Route path="/learning-insights" element={<LearningInsightsPage/>}/>
                <Route path="/assessments" element={<AssessmentsPage/>}/>
                <Route path="/assessments/daily" element={<AssessmentTakingPage/>}/>
                <Route path="/assessments/weekly" element={<AssessmentTakingPage/>}/>
                <Route path="/assessments/monthly" element={<AssessmentTakingPage/>}/>
                <Route path="/assessments/:assessmentId" element={<AssessmentTakingPage/>}/>
                <Route path="/assessments/:assessmentId/results" element={<AssessmentResultsPage/>}/>
                <Route path="/badges" element={<BadgesPage/>}/>
                <Route path="/profile" element={<Profile/>}/>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
