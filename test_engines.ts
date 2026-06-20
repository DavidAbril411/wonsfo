// Script de prueba para validar el motor de clímax y conversión de dialectos
import { evaluateMessageIntimacy, getClimaxMultiplier } from './src/lib/climax-engine';
import { applyLocalLexicon } from './src/lib/dialect-engine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- 🧪 Iniciando Pruebas de climax-engine.ts ---');

// Pruebas de keywords
const scoreBajo = evaluateMessageIntimacy('Hola, ¿cómo estás? Qué lindo día.');
assert(scoreBajo < 10, `Mensaje casual debe tener score bajo (${scoreBajo})`);

const scoreMedio = evaluateMessageIntimacy('Quiero darte un beso íntimo y acariciar tu rostro.');
assert(scoreMedio > 10, `Mensaje sugestivo debe acumular score medio-alto (${scoreMedio})`);

const scoreAlto = evaluateMessageIntimacy('Quiero quitarte la ropa en la cama, desnudarte y hacer el amor.');
assert(scoreAlto > 30, `Mensaje explícito debe acumular score alto (${scoreAlto})`);

// Pruebas de multiplicador
assert(getClimaxMultiplier('Fast') === 1.8, 'Multiplicador Fast debe ser 1.8');
assert(getClimaxMultiplier('Standard') === 1.0, 'Multiplicador Standard debe ser 1.0');
assert(getClimaxMultiplier('Slow') === 0.5, 'Multiplicador Slow debe ser 0.5');


console.log('\n--- 🧪 Iniciando Pruebas de dialect-engine.ts (Reemplazo Léxico) ---');

// Prueba de Argentina
const argentinaNeutral = 'Tú eres muy bonita, tienes que venir con nosotros a tomar una bebida fría.';
const argentinaResultado = applyLocalLexicon(argentinaNeutral, 'Argentina');
console.log(`Original:  "${argentinaNeutral}"`);
console.log(`Argentina: "${argentinaResultado}"`);
assert(argentinaResultado.includes('vos'), 'Debe usar voseo (vos)');
assert(argentinaResultado.includes('sos'), 'Debe usar sos');
assert(argentinaResultado.includes('tenés'), 'Debe usar tenés');
assert(argentinaResultado.includes('trago'), 'Debe traducir bebida a trago');

// Prueba de España
const espanaNeutral = 'Ustedes tienen que ver el celular en la computadora.';
const espanaResultado = applyLocalLexicon(espanaNeutral, 'España');
console.log(`España:    "${espanaResultado}"`);
assert(espanaResultado.includes('vosotros'), 'Debe usar vosotros');
assert(espanaResultado.includes('tenéis'), 'Debe usar tenéis');
assert(espanaResultado.includes('móvil'), 'Debe traducir celular a móvil');
assert(espanaResultado.includes('ordenador'), 'Debe traducir computadora a ordenador');

console.log('\n🎉 ¡TODAS LAS PRUEBAS UNITARIAS DE MOTOR FINALIZARON CON ÉXITO! 🎉');
