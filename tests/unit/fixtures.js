import { Model } from '../../js/model.js';
import { Ops } from '../../js/ops.js';

/** Analyse mit Kette W1 → W2 → W3 (W3 Grundursache) und einem widerlegten Nebenzweig. */
export function sample() {
  const a = Model.create({ name: 'Test' });
  const w1 = Ops.addNode(a, { lens: 'occurrence', parentId: null, text: 'Eins', state: 'confirmed' });
  const w2 = Ops.addNode(a, { lens: 'occurrence', parentId: w1.id, text: 'Zwei', state: 'confirmed' });
  const x2 = Ops.addNode(a, { lens: 'occurrence', parentId: w1.id, text: 'Falsch', state: 'refuted' });
  const w3 = Ops.addNode(a, { lens: 'occurrence', parentId: w2.id, text: 'Drei', state: 'confirmed' });
  Ops.setRoot(a, w3.id, true);
  return { a, w1, w2, x2, w3 };
}
