/**
 * ESLint rule: forbid voseo in string literals (R6/R15 — Panama Spanish uses "tu", never voseo).
 * High-precision token list: only accented voseo forms (unambiguous — no standard "tu" form carries
 * that accent) plus a few unmistakable unaccented imperatives. Avoids false positives on standard
 * "tu" forms (debes/sabes/haces/pones are correct and are NOT matched).
 */
'use strict';

const VOSEO =
  /(?<![\p{L}])(?:vos|tenés|podés|querés|debés|sabés|hacés|ponés|venís|decís|registrá|verificá|seleccioná|ingresá|completá|guardá|enviá|confirmá|agregá|aceptá|continuá|revisá|mirá|andá|fijate|decime|contame|acordate|dale)(?![\p{L}])/iu;

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow voseo in strings (R6/R15: Panama Spanish uses tu)' },
    schema: [],
    messages: {
      noVoseo:
        'Voseo prohibido (R6/R15). Usa espanol neutro de Panama con tu (tienes, puedes, verifica, registra, selecciona, dime). Encontrado: "{{match}}".',
    },
  },
  create(context) {
    function check(node, text) {
      if (typeof text !== 'string') return;
      const m = text.match(VOSEO);
      if (m) context.report({ node, messageId: 'noVoseo', data: { match: m[0] } });
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value && node.value.cooked);
      },
    };
  },
};
