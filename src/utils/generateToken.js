import jwt from 'jsonwebtoken'

export const generateToken = userId => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '120 minutes'})
export const generateResetToken = userId => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h'})
