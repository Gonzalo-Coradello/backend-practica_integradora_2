import fs from 'fs/promises'

class ProductManager {

    constructor(path) {
        this.path = path
        this.format = 'utf-8'
    }

    getProducts = async () => {
        return fs.readFile(this.path, this.format)
            .then(res => {
                if(res) {
                    const products = JSON.parse(res)
                    return products
                } else return []
            })
            .catch(err => {
                console.error('El archivo aún no ha sido creado. Intente añadir un producto')
                return []
            })
    }

    saveProducts = (products) => {
        const productsStr = JSON.stringify(products)
        fs.writeFile(this.path, productsStr, error => console.error(error))
    }

    getProductById = async (id) => {

        const products = await this.getProducts()

        const productFound = products.find(product => product.id == id)
        return productFound || console.error('Product not found')
    }

    getNextID = async () => {

        const products = await this.getProducts()

        const length = products.length

        if(length > 0) {
            const lastProduct = products[length - 1]
            const id = lastProduct.id + 1

            return id
        } else return 1
    }

    checkFields = async (product) => {

        const emptyFields = []
        const products = await this.getProducts()

        const isCodeRepeated = products.some(prod => prod.code === product.code)


        if(isCodeRepeated) {
            console.error(`El código ${product.code} ya está en uso`)
            return false
        }

        const productFields = Object.entries(product)
        productFields.forEach(value => {
            if(!value[1]) emptyFields.push(value[0])
        })

        if(emptyFields.length !== 0) { 
            console.error("Debe completar todos los campos. Campos vacíos: ", emptyFields)
            return false
        } 
        return true
    }

    addProduct = async (obj) => {

        const id = await this.getNextID()
        const product = {
            id,
            ... obj
        }

        if(await this.checkFields(product)) {

            const products = await this.getProducts()

            products.push(product)

            this.saveProducts(products)
            
            return product

        }
    }

    updateProduct = async (id, obj) => {
        const products = await this.getProducts()

        const checkID = () => products.some(prod => prod.id == id)
        if(!checkID()) return console.error("El producto no se encontró")

        const productToUpdate = products.findIndex(prod => prod.id == id)

        products[productToUpdate] = {
            ... products[productToUpdate],
            ... obj,
            id: id
        }

        this.saveProducts(products)
    }

    deleteProduct = async (id) => {
        const products = await this.getProducts()

        const checkID = () => products.some(prod => prod.id == id)
        if(!checkID()) return console.error("El producto no se encontró")

        const updatedProducts = products.filter(prod => prod.id != id)

        this.saveProducts(updatedProducts)
    }
}

export default ProductManager