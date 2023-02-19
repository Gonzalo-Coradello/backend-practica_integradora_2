import { Router } from 'express'
import passport from 'passport'
import CartModel from '../dao/models/cart.model.js'
import ProductModel from '../dao/models/product.model.js'
import UserModel from '../dao/models/user.model.js'
import { createHash, isValidPassword } from '../utils.js'

const router = Router()

function requireAuth(req, res, next) {
    if(req.session?.user) {
        return next()
    } else {
        return res.status(401).redirect('/sessions/login')
    }
}

function logged(req, res, next) {
    if(!req.session?.user) {
        return next()
    } else {
        return res.status(400).redirect('/products')
    }
}


// Redirección para empezar por la pantalla de login
router.get('/', requireAuth)


// Get products
router.get('/products', requireAuth, async (req, res) => {
    try {
        const limit = req.query?.limit || 10
        const page = req.query?.page || 1
        const category = req.query?.category
        const sortQuery = req.query?.sort
        const sortOrder = req.query?.sortorder || 'desc'
        const stock = req.query?.stock

        const query = {
            ... category ? {categories: category} : null,
            ... stock ? {stock: {$gt: 0}} : null
        }

        const sort = {}
        if(sortQuery) {
            sort[sortQuery] = sortOrder
        }

        const options = {
            limit,
            page,
            sort,
            lean: true
        }

        const products = await ProductModel.paginate(query, options)

        products.prevLink = products.hasPrevPage ? `/products?page=${products.prevPage}&limit=${limit}${category ? `&category=${category}` : ''}${stock ? `&stock=${stock}` : ''}` : ''
        products.nextLink = products.hasNextPage ? `/products?page=${products.nextPage}&limit=${limit}${category ? `&category=${category}` : ''}${stock ? `&stock=${stock}` : ''}` : ''

        const user = req.session.user
        res.render('products', {products, user})
    } catch (error) {
        console.log(error)
        res.json({ result: 'error', error })
    }
})



// Create products form
router.get('/products/create', async (req, res) => {
    const user = req.session.user
    res.render('create', {user})
})

// Delete product
router.get('/products/delete/:pid', async (req, res) => {
    try {
        const pid = req.params.pid
        const result = await ProductModel.deleteOne({_id: pid})
        res.redirect('/products')
    } catch(error) {
        console.log(error)
        res.json({ status: 'error', error })   
    }
})

// Get one product
router.get('/products/:pid', async (req, res) => {
    try {
        const pid = req.params.pid
        const product = await ProductModel.findOne({_id: pid}).lean().exec()
        const user = req.session.user
        
        res.render('oneProduct', { product, user })
    } catch(error) {
        console.log(error)
        res.json({ status: 'error', error })   
    }
})

// Add product
router.post('/products', async (req, res) => {
    try {
        // const newProduct = await ProductModel.create(req.body)
        const newProduct = req.body
        const generatedProduct = new ProductModel(newProduct)
        await generatedProduct.save()

        res.redirect('/products/' + generatedProduct._id)
    } catch(error) {
        console.log(error)
        res.json({ status: 'error', error })   
    }
})

// Filter by category
router.post('/products/category', async (req, res) => {
    try {
        const category = req.body.category
        res.redirect(`/products?category=${category}`)        
    } catch(error) {
        console.log(error)
        res.json({ status: 'error', error })   
    }
})


// Get cart products
router.get('/carts/:cid', async (req, res) => {
    try {

        const cid = req.params.cid
        const products = await CartModel.findOne({_id: cid}).populate('products.product').lean()

        const user = req.session.user

        res.render('cart', {products, user})

    } catch (error) {
        console.log(error)
        res.json({ result: 'error', error })
    }
})

// Add product to cart
router.post('/carts/:cid/products/:pid', async (req, res) => {
    try {
        const cid = req.params.cid
        const pid = req.params.pid

        const cart = await CartModel.findOne({_id: cid})
        if(!cart) return res.send({status: "error", error: 'No se ha encontrado el carrito'})

        const product = await ProductModel.findOne({_id: pid})
        if(!product) return res.send({status: "error", error: 'No se ha encontrado el producto'})

        const productIndex = cart.products.findIndex(p => p.product.equals(product._id))
        if(productIndex === -1) {
            cart.products.push({product: product._id, quantity: 1})
            await cart.save()
        } else {
            cart.products[productIndex].quantity++
            await CartModel.updateOne({_id: cid}, cart)
        }

        res.redirect('/carts/' + cid)

    } catch(error) {
        console.log(error)
        res.json({ status: 'error', error })   
    }
})


// Sessions

// Vista para registrar usuarios
router.get('/sessions/register', logged, (req, res) => {
    res.render('sessions/register')
})

// Crear usuarios en la DB
router.post('/sessions/register', passport.authenticate('register', {failureRedirect: 'failregister'}), async( req, res) => {
    res.redirect('/sessions/login')
})
router.get('/failregister', async (req, res) => {
    res.status(400).render('errors/base', {error: 'Failed to register'})
})

// Vista de login
router.get('/sessions/login', logged, (req, res) => {
    res.render('sessions/login')
})

// Login
router.post('/sessions/login', passport.authenticate('login', {failureRedirect: '/faillogin'}), async (req, res) => {
    const user = req.user
    if(!user) return res.status(400).json({status: 'error', error: 'Invalid credentials'})

    req.session.user = {
        first_name: user.first_name,
        last_name: user.last_name,
        age: user.age,
        email: user.email,
        role: user.role
    }
    res.redirect('/products')
})
router.get('/faillogin', (req, res) => {
    res.status(400).render('errors/base', {error: 'Failed login'})
})

// Cerrar sesión
router.get('/sessions/logout', (req, res) => {
    req.session.destroy(err => {
        if(err) {
            res.status(500).render('errors/base', {error: err})
        } else res.redirect('/sessions/login')
    })
})

// Perfil del usuario
router.get('/sessions/user', requireAuth, (req, res) => {
    const user = req.session.user

    if(!user) {
        return res.status(404).render('errors/base', {
            error: 'User not found'
        })
    }

    res.render('sessions/user', {user})
})

// Iniciar sesión con Github
router.get('/api/sessions/githubcallback', passport.authenticate('github', {failureRedirect: '/login'}), async (req, res) => {
    req.session.user = req.user
    return res.redirect('/products')
})

export default router