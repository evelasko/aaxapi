import Sequelize from 'sequelize'

const manager = new Sequelize(
    process.env.STORE_UR, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
          ssl: true,
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 20000
        } 
    }
)

manager.authenticate()
    .then(() => {
        console.log('Manager has connected successfully.');
    })
    .catch(err => {
        console.error('Manager was unable to connect to the database:', err);
    })

export const pCategory = ['Atendee','Speaker']

export const Product = manager.define('product', {
    id: { 
        type: Sequelize.DataTypes.UUID ,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
    },
    name: { type: Sequelize.STRING, allowNull: false },
    description: { type: Sequelize.STRING, allowNull: false },
    content: { type: Sequelize.TEXT, allowNull: false, defaultValue: ''},
    unitprice: { type: Sequelize.FLOAT, allowNull: false },
    category: { type: Sequelize.STRING, allowNull: false, defaultValue: pCategory[0]},
    iconurl: { type: Sequelize.STRING, allowNull: false, defaultValue: '' }
})

export const Discount = manager.define('discount', {
    id: { 
        type: Sequelize.DataTypes.UUID ,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
    },
    email: { type: Sequelize.STRING, allowNull: false},
    applied: { type: Sequelize.BOOLEAN, defaultValue: false }
    }
)

const Invoice = manager.define('invoice', {
    id: { 
        type: Sequelize.DataTypes.UUID ,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
    },
    email: {type: Sequelize.STRING, allowNull: false },
    firstname: {type: Sequelize.STRING, allowNull: false },
    lastname: {type: Sequelize.STRING, allowNull: false },
    address1: {type: Sequelize.STRING, allowNull: false },
    address2: {type: Sequelize.STRING },
    country: {type: Sequelize.STRING, allowNull: false },
    region: {type: Sequelize.STRING, allowNull: false },
    city: {type: Sequelize.STRING, allowNull: false },
    zip: {type: Sequelize.STRING, allowNull: false },
    orderid: {type: Sequelize.STRING, allowNull: false },
    paymentid: {type: Sequelize.STRING }
    },
    {
    getterMethods: {
        fullName() {
            return this.getDataValue('firstname') + this.getDataValue('lastname')
        }
    },
    setterMethods: {}
})


Discount.belongsTo(Product)
Invoice.belongsTo(Product)

// Product.hasMany(Discount, {as: 'discounts', foreignKey: 'd_product_id', sourceKey: 'id'})
// Discount.Product = Discount.belongsTo(Product) //, {foreignKey: 'product_id', sourceKey: 'id'}
// Product.hasMany(Invoice, {as: 'invoices', foreignKey: 'i_product_id', sourceKey: 'id'})
// Invoice.Product = Invoice.belongsTo(Product, ) //{ foreignKey: 'product_id', sourceKey: 'id'}

// manager.sync()

export const addDiscount = async ({ email, productId }) => {
    if (!email) { throw new Error('no email address provided')}
    // check if email has discount associated and if it has been applied
    const productToDiscount = await Product.findOne({ where: { id: productId}})
    if (!productToDiscount) { throw new Error('product to apply discount was not found') }
    const discount = await Discount.findOne({where: {email}})
    if ( discount ) {
        if ( discount.applied ) { throw new Error('the discount has already been used') }
        // if the productId provided is different then reset the discount's product
        if ( discount.productId != productId ) {
            try {
                return await discount.setProduct(productToDiscount)
            } catch(e) { throw new Error('could not change the product to discount') }
            // return await discount.destroy().then(async () => {
            //     const dsc = Discount.create({ email, product_id: productId })
            //     return await dsc.get(['email', 'product_id', 'applied'])
            //}).catch(e => console.log("ERROR: ", e))
        } 
        else { throw new Error('discount exist and has not been applied yet') } 
    } 
    else {
        const dsc = await Discount.create({ email })
        return dsc.setProduct(productToDiscount)
    }
}


// addDiscount( {email:'descuento`estudiante.com', productId: '156f39d8-6521-4a1a-b263-2f29f9f5e8e8'})
// addDiscount( {email:'descuento@ponente.com' , productId:'9eb7c9f3-adb2-4398-bf32-730fbca763c6'})

export default manager
