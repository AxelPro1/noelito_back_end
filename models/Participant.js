const mongoose = require('mongoose');
const Counter = require('./Counter');

const participantSchema = new mongoose.Schema(
    {
        ticketNumber: {
            type: Number,
            unique: true
        },
        fullName: {
            type: String,
            required: [true, 'El nombre completo es obligatorio'],
            trim: true,
            minlength: 3,
            maxlength: 100
        },
        accountName: {
            // Nombre tal cual figura en el comprobante/cuenta desde la que se hizo el depósito.
            // Puede diferir del nombre del participante (ej: deposita un familiar). Es obligatorio
            // para poder cruzar el comprobante con el depósito real al momento de aprobar.
            type: String,
            required: [true, 'El nombre de la cuenta del depositante es obligatorio'],
            trim: true,
            minlength: 3,
            maxlength: 100
        },
        phone: {
            type: String,
            required: [true, 'El número de celular es obligatorio'],
            unique: true, // evita duplicados a nivel de base de datos
            trim: true,
            // Solo digitos, entre 7 y 15 caracteres (formato internacional flexible)
            match: [/^\d{7,15}$/, 'El número de celular no es válido']
        },
        paymentProof: {
            type: String, // URL de Filestack del comprobante subido
            required: [true, 'El comprobante de pago es obligatorio']
        },
        paymentProofName: {
            // Nombre original del archivo (ej: WhatsApp Image 2026-08-22 at 07.46.38.jpeg)
            type: String,
            default: null
        },
        paymentProofExtension: {
            // Extensión en mayúsculas (ej: JPEG, PNG)
            type: String,
            default: null
        },
        paymentProofMimeType: {
            // MIME type normalizado (ej: image/jpeg)
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: ['pendiente', 'aprobado', 'rechazado'],
            default: 'pendiente'
        },
        rejectionReason: {
            type: String,
            default: null
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        isWinner: {
            type: Boolean,
            default: false
        },
        ipAddress: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

// Genera el numero de ticket automaticamente antes de guardar un nuevo registro
participantSchema.pre('save', async function (next) {
    if (this.isNew) {
        this.ticketNumber = await Counter.getNextSequence('ticketNumber');
    }
    next();
});

participantSchema.index({ phone: 1 }, { unique: true });
participantSchema.index({ status: 1 });

module.exports = mongoose.model('Participant', participantSchema);