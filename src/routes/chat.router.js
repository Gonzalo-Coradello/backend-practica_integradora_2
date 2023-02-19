import express from 'express'
// import io from '../app.js'
// import messageModel from '../dao/models/message.model.js'

const router = express.Router()

router.get('/', (req, res) => {
    const user = req.session.user
    res.render('chat', {user})
})

export default router