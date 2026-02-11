import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { createNav, deleteNav, listNav, reorderNav, updateNav } from './navigation.controller';
import { ensureHome, getHomeAdmin, updateHomeContent } from './home.controller';
import { createPage, deletePage, getPageAdmin, listPages, publishPage, unpublishPage, updatePage } from './pages.controller';
import { createPost, deletePost, listPostsAdmin, publishPost, unpublishPost, updatePost } from './posts.controller';
import { getSiteSettingsAdmin, updateSiteSettings } from './siteSettings.controller';
import { deleteFormSubmission, getFormSubmission, listFormSubmissions } from './formSubmissions.controller';

export const adminRoutes = Router();

adminRoutes.use(requireAuth);

adminRoutes.get('/navigation-items', listNav);
adminRoutes.post('/navigation-items', createNav);
adminRoutes.patch('/navigation-items/reorder', reorderNav);
adminRoutes.patch('/navigation-items/:id', updateNav);
adminRoutes.delete('/navigation-items/:id', deleteNav);

// Legacy aliases
adminRoutes.get('/admin/nav', listNav);
adminRoutes.post('/admin/nav', createNav);
adminRoutes.put('/admin/nav/:id', updateNav);
adminRoutes.patch('/admin/nav/:id', updateNav);
adminRoutes.delete('/admin/nav/:id', deleteNav);

adminRoutes.get('/admin/home', getHomeAdmin);
adminRoutes.put('/admin/home/:id', updateHomeContent);
adminRoutes.post('/admin/pages/ensure-home', ensureHome);

adminRoutes.get('/admin/pages', listPages);
adminRoutes.post('/admin/pages', createPage);
adminRoutes.get('/admin/pages/:id', getPageAdmin);
adminRoutes.put('/admin/pages/:id', updatePage);
adminRoutes.post('/admin/pages/:id/publish', publishPage);
adminRoutes.post('/admin/pages/:id/unpublish', unpublishPage);
adminRoutes.delete('/admin/pages/:id', deletePage);

adminRoutes.get('/admin/posts', listPostsAdmin);
adminRoutes.post('/admin/posts', createPost);
adminRoutes.put('/admin/posts/:id', updatePost);
adminRoutes.delete('/admin/posts/:id', deletePost);
adminRoutes.patch('/admin/posts/:id/publish', publishPost);
adminRoutes.patch('/admin/posts/:id/unpublish', unpublishPost);

// Articles alias (cleaner path)
adminRoutes.get('/articles', listPostsAdmin);
adminRoutes.post('/articles', createPost);
adminRoutes.patch('/articles/:id', updatePost);
adminRoutes.delete('/articles/:id', deletePost);
adminRoutes.post('/articles/:id/publish', publishPost);
adminRoutes.post('/articles/:id/unpublish', unpublishPost);

adminRoutes.get('/admin/site-settings', getSiteSettingsAdmin);
adminRoutes.patch('/admin/site-settings', updateSiteSettings);

adminRoutes.get('/admin/form-submissions', listFormSubmissions);
adminRoutes.get('/admin/form-submissions/:id', getFormSubmission);
adminRoutes.delete('/admin/form-submissions/:id', deleteFormSubmission);
