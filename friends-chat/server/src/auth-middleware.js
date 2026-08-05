const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
console.log('auth-middleware sees JWT_SECRET:', JWT_SECRET);


function requireAuth(req, res, next) {

    const result =  req.headers.authorization

    if(!result){
        console.log("ERROR 401")
        return res.status(401).json({ error: "No token provided" });
    }

    const header = result.split(' ')
    const token = header[1]

    try{
        const payload = jwt.verify(token, JWT_SECRET)
        req.userId = payload.userId
        next()


    }catch(error){
        console.log("Invalid token")
        return res.status(401).json({ error: "Invalid token" });
    }


}

module.exports = requireAuth;



