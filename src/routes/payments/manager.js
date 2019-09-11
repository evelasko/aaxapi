import Sequelize from 'sequelize'
const uuidv4 = require('uuid/v4')

const manager = new Sequelize(
    process.env.STORE_UR, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
          ssl: process.env.PG_SCHEMA_NAME === 'aaxapi$dev' ? false : true,
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

export const pCategory = ['Attendee','Speaker']

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
    base: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    requirements: { type: Sequelize.TEXT  }
})

export const Discount = manager.define('discount', {
    id: { 
        type: Sequelize.DataTypes.UUID ,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
    },
    email: { type: Sequelize.STRING, allowNull: false},
    firstname: { type: Sequelize.STRING, allowNull: false},
    lastname: { type: Sequelize.STRING, allowNull: false},
    applied: { type: Sequelize.BOOLEAN, defaultValue: false },
    approved: { type: Sequelize.BOOLEAN, defaultValue: false},
    documentation: { type: Sequelize.ARRAY(Sequelize.STRING), defaultValue: []}
    }
)

export const Invoice = manager.define('invoice', {
    id: { 
        type: Sequelize.DataTypes.UUID ,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
    },
    amount: {type: Sequelize.INTEGER, allowNull: false},
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
})

Discount.belongsTo(Product)
Invoice.belongsTo(Product)

// -------------------------------------------- SYNC LINE
// manager.sync()

// -------------------------------------------- BASE DATA
const populateAndSyncDB = async () => {
    
    await manager.sync()

    // ---- ATTENDEE PRODUCTS
    await Product.create({
        name: 'Acceso Participante',
        description: 'Entrada General',
        content: 'Includes A and B and C',
        unitprice: 150.00,
        category: 'Attendee',
        base: true,
    })
    const pa = await Product.create({
        name: 'Acceso Participante',
        description: 'Estudiante URJC/IAA',
        content: 'Incluye A y B y C',
        unitprice: 90.00,
        category: 'Attendee',
        requirements: 'D, E, F',
    })
    const pb = await Product.create({
        name: 'Acceso Participante',
        description: 'Miembro UNITWIN/ITI',
        content: 'Incluye assets 1, 2 y 3',
        unitprice: 125.00,
        category: 'Attendee',
        requirements: 'G, H, I',
    })
    const pc = await Product.create({
        name: 'Acceso Participante',
        description: 'Estudiante 3er Ciclo URJC/IAA',
        content: 'Incluye assets 1, 2 y 3',
        unitprice: 150.00,
        category: 'Attendee',
        requirements: 'M, N, V'
    })

    // ---- SPEAKER PRODUCTS
    await Product.create({
        name: 'Tasa Ponencia/Comunicación',
        description: 'General',
        content: 'Incluye 1 y 2',
        unitprice: 180.00,
        category: 'Speaker',
        base: true,
    })
    const pd = await Product.create({
        name: 'Tasa Ponencia/Comunicación',
        description: 'Estudiante URJC/IAA',
        content: 'Incluye 1 y 2',
        unitprice: 150.00,
        category: 'Speaker',
        requirements: 'R, T, Y',
    })
    const pe = await Product.create({
        name: 'Tasa Ponencia/Comunicación',
        description: 'Miembro UNITWIN/ITI',
        content: 'Incluye 1 y 2',
        unitprice: 150.00,
        category: 'Speaker',
        requirements: 'X, V, C',
    })
    const pf = await Product.create({
        name: 'Tasa Ponencia/Comunicación',
        description: 'Estudiante 3er Ciclo URJC/IAA',
        content: 'Incluye 1 y 2',
        unitprice: 100.00,
        category: 'Speaker',
        requirements: 'X, V, C',
    })

    // -- DISCOUNTS
    const da = await Discount.create({ email: 'estudiante@attendee.com', approved: true })
    da.setProduct(pa)
    const db = await Discount.create({ email: 'miembro@attendee.com', approved: true })
    db.setProduct(pb)
    const dc = await Discount.create({ email: 'tercerciclo@attendee.com', approved: false })
    dc.setProduct(pc)
    const dd = await Discount.create({ email: 'estudiante@speaker.com', approved: true })
    dd.setProduct(pd)
    const de = await Discount.create({ email: 'miembro@speaker.com', approved: true })
    de.setProduct(pe)
    const df = await Discount.create({ email: 'tercerciclo@speaker.com', approved: false })
    df.setProduct(pf)
}

// -- EXECUTE SYNC
// try {
//     populateAndSyncDB()
// } catch(e) { console.log("ERROR: ", e)}


export const addDiscount = async ({ email, productId, documentation, firstname, lastname }) => {
    if (!email) { throw new Error('no email address provided')}
    //-- check if email has discount associated and if it has been applied
    const productToDiscount = await Product.findOne({ where: { id: productId}})
    if (!productToDiscount) { throw new Error('product to apply discount was not found') }
    const discount = await Discount.findOne({where: {email}})
    if ( discount ) {
        if ( discount.applied ) { throw new Error('the discount has already been used') }
        //-- if the productId provided is different then reset the discount's product
        if ( discount.productId != productId ) {
            try {
                return await discount.setProduct(productToDiscount)
            } catch(e) { throw new Error('could not change the product to discount') }
        } 
        else { throw new Error('discount exist and has not been applied yet') } 
    } 
    else {
        try {
            console.log('creating new discount')
            const dsc = await Discount.create({ email, documentation, firstname, lastname })
            return dsc.setProduct(productToDiscount)
        } catch(e) { throw new Error(`Unable to create discount: ${e}`)}   
    }
}

export default manager
