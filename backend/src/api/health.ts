import { Router, Request, Response } from 'express';

export const healthRouter: Router = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'asg-content-backend',
    version: '1.0.0',
  });
});
