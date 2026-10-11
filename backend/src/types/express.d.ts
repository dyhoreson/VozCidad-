declare namespace Express {
  interface Request {
    auth?: { userId: string; role: string; email: string; accessToken: string }
    requestId?: string
  }
}
