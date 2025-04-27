const Contact = require('../models/Contact');

async function getAllContacts(req) {
    return await Contact.find({ owner: req.user.username }).sort({ createdAt: -1 });
}

async function createContact(contactData, username) {
    const contact = new Contact({
        ...contactData,
        owner: username,
        createdAt: new Date()
    });
    return await contact.save();
}

async function updateContact(id, contactData) {
    return await Contact.findByIdAndUpdate(
        id,
        contactData,
        { new: true }
    );
}

async function deleteContact(id) {
    return await Contact.findByIdAndDelete(id);
}

async function getContactsByMonth(month, username) {
    const startDate = new Date();
    startDate.setMonth(month - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    return await Contact.find({
        owner: username,
        createdAt: {
            $gte: startDate,
            $lt: endDate
        }
    }).sort({ createdAt: -1 });
}

module.exports = {
    getAllContacts,
    createContact,
    updateContact,
    deleteContact,
    getContactsByMonth
};
