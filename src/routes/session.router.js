import { Router } from "express";
import UserModel from "../dao/models/user.model.js";
import { createHash, isValidPassword } from "../utils.js";
import passport from "passport";

const router = Router()

// Middleware
function logged(req, res, next) {
    if(!req.session?.user) {
        return next()
    } else {
        return res.status(400).json({status: 'error', payload: 'already logged in'})
    }
}
function requireAuth(req, res, next) {
    if(req.session?.user) {
        return next()
    } else {
        return res.status(401).json({status: 'error', payload: 'not authenticated'})
    }
}

// Crear usuarios en la DB
router.post('/register', logged, passport.authenticate('register', {failureRedirect: '/failregister'}), async( req, res) => {
    res.json({status: 'success', payload: req.user})
})
router.get('/failregister', async (req, res) => {
    res.json({status: 'error', error: 'Failed to register'})
})

// Login
router.post('/login', logged, passport.authenticate('login', {failureRedirect: '/faillogin'}), async (req, res) => {
    const user = req.user
    if(!user) return res.status(400).json({status: 'error', error: 'Invalid credentials'})

    req.session.user = {
        first_name: user.first_name,
        last_name: user.last_name,
        age: user.age,
        email: user.email,
        role: user.role
    }
    res.json({status: 'success', payload: user})
})
router.get('/faillogin', (req, res) => {
    res.json({status: 'error', error: 'Failed login'})
})

// Cerrar sesión
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if(err) {
            res.status(500).json({status: 'error', payload: err})
        } else res.json({status: 'success', payload: 'Logged out'})
    })
})

// Perfil del usuario
router.get('/user', requireAuth, (req, res) => {
    const user = req.session.user

    if(!user) {
        return res.status(404).render('errors/base', {
            error: 'User not found'
        })
    }

    res.json({status: 'success', payload: user})
})

// Iniciar sesión con Github
router.get('/github', passport.authenticate('github', { scope: ['user:email']}), async (req, res) => {})

// router.get('/githubcallback', passport.authenticate('github', {failureRedirect: '/login'}), async (req, res) => {
//     req.session.user = req.user
//     res.json({status: 'success', payload: req.user})
// })

export default router