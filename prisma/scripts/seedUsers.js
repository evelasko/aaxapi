const { prisma } = require('../client')
const users = require('../backups/16-09-19/user.json')

module.exports = function () {
    users.forEach(async (user) => {       
        const { firstname, lastname, group, isAdmin, emailVerified, password, email } = user
        let devices = {}
        if (user.notificationsDevice) {
            const {notificationsDevice, notificationsPermission} = user
            devices = { create : { 
                type: "PHONE",
                verified: true,
                notificationsPermission,
                notificationsDevice
            } }
        }
        const u = await prisma.createUser({
            firstname, 
            lastname, 
            group, 
            isAdmin, 
            email, 
            emailVerified, 
            password, 
            devices
        }, `{id}`)
    });
}
