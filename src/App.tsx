import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage').then((module) => ({ default: module.ArticlesPage })));
const SourcesPage = lazy(() => import('./pages/SourcesPage').then((module) => ({ default: module.SourcesPage })));
const RulesPage = lazy(() => import('./pages/RulesPage').then((module) => ({ default: module.RulesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage').then((module) => ({ default: module.ArticleDetailPage })));
function Loading(){return <div className="center-screen"><div className="spinner"/>Đang tải…</div>;}
export default function App(){return <BrowserRouter><Suspense fallback={<Loading/>}><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<ProtectedRoute/>}><Route element={<AppShell/>}><Route index element={<ArticlesPage/>}/><Route path="sources" element={<SourcesPage/>}/><Route path="rules" element={<RulesPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="article/:id" element={<ArticleDetailPage/>}/></Route></Route><Route path="*" element={<main className="empty-state"><h1>Không tìm thấy trang</h1><a href="/">Về trang tin</a></main>}/></Routes></Suspense></BrowserRouter>}
