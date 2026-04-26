import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { usersRouter } from './users';
import { settingsRouter } from './settings';
import { searchRouter } from './search';
import { keywordsRouter } from './keywords';
import { topicsRouter } from './topics';
import { contentsRouter } from './contents';
import { skillsRouter } from './skills';
import { publishRouter } from './publish';
import { analyticsRouter } from './analytics';
import { assetsRouter } from './assets';
import { uploadRouter } from './upload';
import { notificationRouter } from './notifications';
import { workflowsRouter } from './workflows';
import { draftsRouter } from './drafts';
import { knowledgeBaseGroupsRouter } from './knowledge-base-groups';
import { knowledgeBasesRouter } from './knowledge-bases';
import { knowledgeBaseDocumentsRouter } from './knowledge-base-documents';

export const apiRouter: Router = Router();

// Health check
apiRouter.use('/', healthRouter);

// API routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/keywords', keywordsRouter);
apiRouter.use('/topics', topicsRouter);
apiRouter.use('/contents', contentsRouter);
apiRouter.use('/skills', skillsRouter);
apiRouter.use('/workflows', workflowsRouter);
apiRouter.use('/drafts', draftsRouter);
apiRouter.use('/publish', publishRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/assets', assetsRouter);
apiRouter.use('/upload', uploadRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/knowledge-base-groups', knowledgeBaseGroupsRouter);
apiRouter.use('/knowledge-bases', knowledgeBasesRouter);
apiRouter.use('/knowledge-base-documents', knowledgeBaseDocumentsRouter);

// Static files for uploads
import express from 'express';
apiRouter.use('/uploads', express.static('uploads'));
