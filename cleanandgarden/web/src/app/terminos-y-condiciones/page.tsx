"use client"

import React from "react"

export default function TerminosCondicionesPage() {
  return (
    <div className="min-h-screen bg-[#fefaf2]">
      {/* Header */}
      <div className="bg-[#2E5430] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Términos y Condiciones
          </h1>
          <p className="text-lg md:text-xl opacity-90">
            Conoce las reglas y condiciones de nuestro servicio
          </p>
          <div className="mt-6 text-sm opacity-75">
            Última actualización: {new Date().toLocaleDateString('es-CL')}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">

          {/* Introducción */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              1. Introducción
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Bienvenido a <strong>Clean & Garden</strong>. Estos términos y condiciones regulan el uso de nuestros servicios de jardinería y mantenimiento de espacios verdes.
              Al contratar nuestros servicios, aceptas cumplir con estos términos.
            </p>
          </div>

          {/* Servicios */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              2. Servicios Ofrecidos
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Servicios Incluidos</h3>
              <p className="text-blue-700">
                <strong>Servicio base incluye:</strong> Mano de obra especializada, equipos profesionales y productos básicos.
                <strong> Insumos adicionales:</strong> Durante el servicio, pueden requerirse productos específicos
                (fertilizantes, pesticidas, semillas, etc.) que serán agregados al costo final según su uso real.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-[#2E5430]">Servicios Residenciales</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Mantenimiento de jardines</li>
                  <li>• Corte de césped</li>
                  <li>• Poda de árboles y arbustos</li>
                  <li>• Control de plagas naturales</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-[#2E5430]">Servicios Empresariales</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Mantenimiento de áreas verdes</li>
                  <li>• Diseño de jardines corporativos</li>
                  <li>• Servicios de emergencia</li>
                  <li>• Consultoría especializada</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-800 mb-2">Insumos y Materiales Adicionales</h3>
              <p className="text-yellow-700 text-sm">
                <strong>Transparencia total:</strong> Si durante el servicio se requieren insumos adicionales como fertilizantes,
                pesticidas específicos, semillas, tierra, o cualquier otro material necesario para completar el trabajo de manera
                óptima, estos serán informados y agregados al costo final. El precio de cada insumo se calcula según su costo
                real más un margen razonable por gestión y transporte.
              </p>
            </div>
          </div>

          {/* Reservas y Pagos */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              3. Reservas y Pagos
            </h2>
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Modelo de Pago Seguro</h3>
              <p className="text-green-700">
                <strong>Pagas solo por servicios realizados.</strong> Nuestro sistema único te permite reservar con confianza,
                sabiendo que el pago se procesa únicamente después de que el trabajo esté completado a tu satisfacción.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#2E5430] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Reservas:</strong> Programa tu cita sin compromiso financiero. Las reservas son gratuitas y flexibles.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#2E5430] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Pagos:</strong> El pago se solicita automáticamente una vez completado el servicio, a través de WebPay de forma segura.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#2E5430] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Facturación:</strong> Recibes tu boleta o factura inmediatamente después del pago exitoso.
                </p>
              </div>
            </div>
          </div>

          {/* Proceso de Pago Post-Servicio */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              4. Proceso de Pago Post-Servicio
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">🔄 Cómo Funciona</h3>
              <p className="text-blue-700">
                <strong>Tu tranquilidad es nuestra prioridad.</strong> Reserva sin riesgos y paga solo cuando estés completamente satisfecho con el trabajo realizado.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  Después del Servicio
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Recibes un resumen detallado del trabajo realizado</li>
                  <li>• Se listan todos los productos e insumos utilizados (incluyendo adicionales necesarios)</li>
                  <li>• Se calcula automáticamente el costo total (mano de obra + insumos utilizados)</li>
                  <li>• Aparece el botón de pago seguro con WebPay</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="text-blue-600 mr-2">💳</span>
                  Pago Seguro
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Pago único y final por el servicio completo (mano de obra + insumos utilizados)</li>
                  <li>• Procesamiento seguro a través de WebPay</li>
                  <li>• Confirmación inmediata del pago</li>
                  <li>• Boleta o factura emitida automáticamente</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Responsabilidades */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              5. Responsabilidades
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">Nuestras Responsabilidades</h3>
              <ul className="text-yellow-700 space-y-1">
                <li>• Realizar los servicios con profesionalismo y cuidado</li>
                <li>• Utilizar equipos y productos seguros</li>
                <li>• Respetar los horarios acordados</li>
                <li>• Mantener la confidencialidad de tu información</li>
              </ul>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Tus Responsabilidades</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Proporcionar acceso seguro a tu jardín</li>
                <li>• Informar sobre alergias o restricciones especiales</li>
                <li>• Pagar por los servicios prestados</li>
                <li>• Cancelar con anticipación si es necesario</li>
              </ul>
            </div>
          </div>

          {/* Cancelaciones y Modificaciones */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              6. Cancelaciones y Modificaciones
            </h2>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-6 rounded-r-lg mb-6">
              <h3 className="font-semibold text-orange-800 mb-2">📅 Política de Cancelación</h3>
              <p className="text-orange-700">
                <strong>Sin riesgos de cancelación.</strong> Dado que el pago se realiza después del servicio completado,
                puedes cancelar tu cita en cualquier momento sin costo adicional.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Cancelación gratuita:</strong> Puedes cancelar o modificar tu cita hasta el momento del servicio sin ningún costo.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#2E5430] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Modificaciones:</strong> Si necesitas cambiar la fecha u hora, puedes hacerlo libremente hasta 24 horas antes del servicio programado.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Cancelación tardía:</strong> Si cancelas con menos de 24 horas de anticipación, se aplicará un cargo administrativo de $5.000 CLP por gastos de coordinación.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>No-show:</strong> Si no estás presente en el horario acordado sin aviso previo, se aplicará un cargo completo por el servicio programado.
                </p>
              </div>
            </div>
          </div>

          {/* Protección de Datos */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              7. Protección de Datos Personales
            </h2>
            <p className="text-gray-700 mb-4">
              En Clean & Garden nos comprometemos a proteger tu privacidad y datos personales:
            </p>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#2E5430] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  Utilizamos tus datos únicamente para prestar nuestros servicios y mejorar tu experiencia.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#2E5430] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  No compartimos tu información con terceros sin tu consentimiento expreso.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#2E5430] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  Puedes solicitar la eliminación de tus datos en cualquier momento.
                </p>
              </div>
            </div>
          </div>

          {/* Limitación de Responsabilidad */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              8. Limitación de Responsabilidad
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800">
                Clean & Garden no se hace responsable por daños preexistentes en plantas o estructuras,
                condiciones climáticas adversas que impidan la realización del servicio, o situaciones
                fuera de nuestro control razonable.
              </p>
            </div>
          </div>

          {/* Contacto */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#2E5430] mb-4">
              9. Contacto
            </h2>
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
              <h3 className="font-semibold text-green-800 mb-3">¿Necesitas Ayuda?</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-800 mb-2">📧 Email</h4>
                  <p className="text-green-700">contacto@cleanandgarden.cl</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-2">📱 WhatsApp</h4>
                  <p className="text-green-700">+56 9 1234 5678</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-2">🕒 Horarios de Atención</h4>
                  <p className="text-green-700">Lunes a Viernes: 8:00 - 18:00</p>
                  <p className="text-green-700">Sábados: 9:00 - 14:00</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-2">📍 Ubicación</h4>
                  <p className="text-green-700">Santiago, Chile</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t text-center">
            <p className="text-gray-600 text-sm">
              Al utilizar nuestros servicios, confirmas que has leído y aceptado estos términos y condiciones.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Clean & Garden © {new Date().getFullYear()}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}