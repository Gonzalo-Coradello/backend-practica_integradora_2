import fs from 'fs/promises'

class CartManager {

    constructor(path) {
        this.path = path
        this.format = 'utf-8'
    }

    read = async () => {
        return fs.readFile(this.path, this.format)
        .then(res => {
            if(res) {
                const carts = JSON.parse(res)
                return carts
            } else return []
        })
        .catch(err => {
            console.error('El archivo aún no ha sido creado. Intente añadir un producto')
            return []
        }) 
    }

    write = (carts) => {
        const cartsStr = JSON.stringify(carts)
        fs.writeFile(this.path, cartsStr, error => console.error(error))
    }

    getNextID = async () => {

        const carts = await this.read()

        const length = carts.length

        if(length > 0) {
            const lastCart = carts[length - 1]
            const id = parseInt(lastCart.id) + 1

            return id
        } else return 1
    }

    createCart = async () => {
        const id = await this.getNextID()
        const cart = {
            id,
            products: []
        }

        const carts = await this.read()

        carts.push(cart)

        this.write(carts)

        return cart
    }

    findCart = async (cid) => {
        const carts = await this.read()

        const cart = carts.find(cart => cart.id == cid)

        if(!cart) return console.error("No se encontró el carrito")

        return cart
    }

    getProducts = async (cid) => {
        const cart = await this.findCart(cid)

        if(cart) return cart.products
    }

    findProduct = async (cid, pid) => {
        const products = await this.getProducts(cid)
        
        const product = products?.find(prod => prod.id == pid)

        if(product) return product
        return false
    }

    update = async (cid, obj) => {
        obj.id = cid
        const carts = await this.read()

        const checkID = () => carts.some(cart => cart.id == cid)
        if(!checkID()) return console.error("El carrito no se encontró")

        const cartIndex = carts.findIndex(cart => cart.id == cid)

        carts[cartIndex] = obj

        await this.write(carts)
    }


    addProduct = async (cid, pid) => {
        
        const cart = await this.findCart(cid)

        const product = await this.findProduct(cid, pid)

        if(!cart) return console.error({error: "No se encontró el carrito"})
        
        if(!product) cart.products.push({id: pid, quantity: 1})
        else {
            const products = await this.getProducts(cid)
            const productToUpdate = products.findIndex(prod => prod.id == pid)
            cart.products[productToUpdate].quantity++ 
        }
        
        await this.update(cid, cart)
        return cart
    }

}

export default CartManager