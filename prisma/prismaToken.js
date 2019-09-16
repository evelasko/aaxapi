const jwt = require('jsonwebtoken')

console.log(`

MANAGEMENT TOKEN:
${jwt.sign({ "grants": [ { "target": "*/*", "action": "*" } ]},process.env.PRISMA_MANAGEMENT_API_SECRET,{expiresIn: '120d'})}

SERVICE TOKEN:
${jwt.sign({"data": { "service": "aaxapi@dex", "roles": ["admin"] }},process.env.PRISMA_SECRET, {expiresIn: '200d'})}

`)