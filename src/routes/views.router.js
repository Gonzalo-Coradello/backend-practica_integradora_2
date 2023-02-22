import { Router } from 'express'
import passport from 'passport'
import CartModel from '../dao/models/cart.model.js'
import ProductModel from '../dao/models/product.model.js'
import { passportCall, viewsAuthorization } from '../utils.js'


const router = Router()

// function requireAuth(req, res, next) {
//     if(req.session?.user) {
//         return next()
//     } else {
//         return res.status(401).redirect('/sessions/login')
//     }
// }

// function logged(req, res, next) {
//     if(!req.session?.user) {
//         return next()
//     } else {
//         return res.status(400).redirect('/products')
//     }
// }


// Redirección para empezar por la pantalla de login
router.get('/', (req, res) => {
    res.redirect('/sessions/login')
})


// Get products
router.get('/products', passportCall('current'), viewsAuthorization('user'), async (req, res) => {
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

        const user = req.user
        res.render('products', {products, user})
    } catch (error) {
        console.log(error)
        res.json({ result: 'error', error })
    }
})



// Create products form
router.get('/products/create', passportCall('current'), viewsAuthorization('admin'), async (req, res) => {
    const user = req.user
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
router.get('/products/:pid', passportCall('current'), viewsAuthorization('user'), async (req, res) => {
    try {
        const pid = req.params.pid
        const product = await ProductModel.findOne({_id: pid}).lean().exec()
        const user = req.user
        
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
router.get('/carts/:cid', passportCall('current'), viewsAuthorization('user'), async (req, res) => {
    try {

        const cid = req.params.cid
        const products = await CartModel.findOne({_id: cid}).populate('products.product').lean()

        const user = req.user

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
router.get('/sessions/register', (req, res) => {
    res.render('sessions/register')
})

// Crear usuarios en la DB
router.post('/sessions/register', passportCall('register'), async( req, res) => {
    res.redirect('/sessions/login')
})


// Vista de login
router.get('/sessions/login', (req, res) => {
    res.render('sessions/login')
})

// Login
router.post('/sessions/login', passportCall('login'), async (req, res) => {
    const user = req.user
    if(!user) return res.status(400).json({status: 'error', error: 'Invalid credentials'})

    res.cookie('cookieToken', user.token).redirect('/products')
})

// Cerrar sesión
router.get('/sessions/logout', (req, res) => {
    res.clearCookie('cookieToken').redirect('/sessions/login')
})

// Perfil del usuario
router.get('/sessions/user', passportCall('current'), viewsAuthorization('user'), (req, res) => {
    const user = req.user

    if(!user) {
        return res.status(404).render('errors/base', {
            error: 'User not found'
        })
    }

    res.render('sessions/user', {user})
})

// Iniciar sesión con Github
router.get('/api/sessions/githubcallback', passport.authenticate('github', {failureRedirect: '/login'}), async (req, res) => {

    return res.cookie('cookieToken', req.user.token).redirect('/products')
})

export default router