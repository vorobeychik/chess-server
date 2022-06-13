const { Router } = require('express')
const router = Router();
const jwt = require("jsonwebtoken");
const userService = require('./user.service')

require('dotenv').config()
const secret = process.env.JWT_SECRET;


router.get(
    '/auth',
    async (req, res) => {
        try {
            const { code } = req.query;
            const data = await userService.getGitHubAccessToken(code);
            const accessToken = userService.decodeAccessToken(data);
            const gitHubUser = await userService.getUserGitHubProfileData(accessToken)
            const candidate = await userService.getUser(gitHubUser.id);

            if(!candidate){
                const user = await userService.createUser(gitHubUser.id);
            }

            const token = jwt.sign(gitHubUser, secret);

            res.cookie('github-jwt',token, {
                domain: 'localhost'
            })

            res.redirect('http://localhost:3000')
        }catch (e){

        }

    }
)


router.get('/',async (req, res) => {
    try {
        const token = req.cookies['github-jwt'];
        const gitHubProfile = jwt.verify(token, secret);
        const userData = await userService.getUser(gitHubProfile.id);
        const user = {...gitHubProfile,...JSON.parse(JSON.stringify(userData))};
        res.json(user)
    }catch (error){
        res.send(null)
    }

})



module.exports = router;