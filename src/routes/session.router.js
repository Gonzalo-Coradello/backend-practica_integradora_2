import { Router } from "express";
import passport from "passport";
import { passportCall } from "../utils.js";

const router = Router()

// Crear usuarios en la DB
router.post('/register', passportCall('register'), async (req, res) => {

    res.json({status: 'success', payload: req.user})
})

// Login
router.post('/login', passportCall('login'), async (req, res) => {
  
    res.cookie('cookieToken', req.user.token).json({status: 'success', payload: req.user})
})

// Cerrar sesión
router.get('/logout', (req, res) => {
    res.clearCookie('cookieToken').send({status: 'success', message: 'Logged out'})
})

// Perfil del usuario
router.get('/current', passportCall('current'), async (req, res) => {
    const user = req.user

    if(!user) return res.status(404).json({status: 'error', error: 'User not found'})
    
    res.json({status: 'success', payload: user})
})

// Iniciar sesión con Github
router.get('/github', passport.authenticate('github', { scope: ['user:email']}), async (req, res) => {})

export default router