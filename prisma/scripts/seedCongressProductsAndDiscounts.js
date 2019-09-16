const { prisma } = require('../client')

module.exports = async () => {
    // create categories if not exists
    let cat = await prisma.productCategory({ name: "Eventos Académicos"})
    if (!cat) {
        cat = await prisma.createProductCategory({ name: "Eventos Académicos" })
    }
    const { id } = cat

    // base product for attendee
    let base_atd = await prisma.createProduct({
        id: "ck0myx7uh09nl08310nsino7c",
        name: "Acceso Oyente",
        description: "Congreso IAE 2019",
        content: "",
        unitPrice: 150.0,
        category: { connect: { id } }
    })

    let d1 = await prisma.createDiscount({
        id: "ck0myx7vw09nr0831q7kct5lq",
        name: "Descuento Estudiante",
        description: "Descuento para estudiantes universitarios o equivalente.",
        requirements: "Agregar imagen de matrícula para el curso 2019–2020 de un grado o título universitario.",
        unitPrice: 90.0,
        product: { connect: { id: base_atd.id} }
    })
    let d2 = await prisma.createDiscount({
        id: "ck0myx7wl09nx0831zpzjb68x",
        name: "Descuento ITI / UNITWIN / WDA",
        description: "Disponible para miembros de ITI, la red de universidades UNITWIN o la Alianza Mundial de la Danza",
        requirements: "Agregar certificación de memebresía de alguna de las organizaciones para las que es descuento está disponible.",
        unitPrice: 90,
        product: { connect: { id: base_atd.id} }
    })
    let d3 = await prisma.createDiscount({
        id: "ck0myx7xg09o30831sc2q7jir",
        name: "Descuento Tercer Ciclo",
        description: "Descuento disponible para estudiantes de tercer ciclo: máster o aspirantes a doctor",
        requirements: "Agregar imagen de matrícula para el curso 2019–2020 de estudios de máster, o certificado de inscripción de tesis doctoral.",
        unitPrice: 90,
        product: { connect: { id: base_atd.id} }
    })
    let d4 = await prisma.createDiscount({
        id: "ck0myx7yc09o90831a7n770if",
        name: "Estudiantes Grado/Título Instituto Alicia Alonso",
        description: "Descuento disponible para los estudiantes del Grado en Artes Visuales y Danza, Grado en Artes Visuales y Pedagogía de la Danza y Título Superior de Danza del Instituto Universitario Alicia Alonso.",
        requirements: "Agregar imagen de matrícula del cuero 2019–2020 de uno de los programas para los que está disponible el descuento.",
        unitPrice: 40,
        product: { connect: { id: base_atd.id} }
    })

    // base product for speaker
    let base_spk = await prisma.createProduct({
        id: "ck0myx7z109of0831uuf0rjtc",
        name: "Acceso Comunicador",
        description: "Congreso IAE 2019",
        content: "",
        unitPrice: 180.0,
        category: { connect: { id } }
    })
    let d5 = await prisma.createDiscount({
        id: "ck0myx7zu09ol0831hbyydmcp",
        name: "Descuento Estudiante",
        description: "Descuento para estudiantes universitarios o equivalente.",
        requirements: "Agregar imagen de matrícula para el curso 2019–2020 de un grado o título universitario.",
        unitPrice: 90,
        product: { connect: { id: base_spk.id} }
    })
    let d6 = await prisma.createDiscount({
        id: "ck0myx80f09or0831mbzr21rt",
        name: "Descuento ITI / UNITWIN / WDA",
        description: "Disponible para miembros de ITI, la red de universidades UNITWIN o la Alianza Mundial de la Danza",
        requirements: "Agregar certificación de memebresía de alguna de las organizaciones para las que es descuento está disponible.",
        unitPrice: 100,
        product: { connect: { id: base_spk.id} }
    })
    let d7 = await prisma.createDiscount({
        id: "ck0myx81009ox0831nbn9e4g7",
        name: "Descuento Tercer Ciclo",
        description: "Descuento disponible para estudiantes de tercer ciclo: máster o aspirantes a doctor",
        requirements: "Agregar imagen de matrícula para el curso 2019–2020 de estudios de máster, o certificado de inscripción de tesis doctoral.",
        unitPrice: 100,
        product: { connect: { id: base_spk.id} }
    })
}
