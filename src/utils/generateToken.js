import { sign } from 'jsonwebtoken'

export const generateToken = userId => sign( userId , process.env.JWT_SECRET, { expiresIn: '24h'})
export const generateResetToken = userId => sign( userId, process.env.JWT_SECRET, { expiresIn: '24h'})
export const generateLoginToken = loginData => sign( loginData, process.env.JWT_SECRET, {expiresIn: '120min'})