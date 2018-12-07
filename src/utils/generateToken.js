import jwt from 'jsonwebtoken'

const generateToken = userId => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30 minutes'})

export { generateToken as default }