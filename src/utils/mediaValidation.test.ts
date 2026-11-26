import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDeliveryAsTextFile,
  sanitizeDeliveryFields,
  sanitizeTextFileName,
  validateCheckoutPaymentSelection,
  validateImageUploadPayload,
  validatePaymentGatewayPayload,
} from './mediaValidation';

test('validateImageUploadPayload accepts valid PNG magic bytes and rejects fake SVG/HTML payloads', () => {
  const validPngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ]).toString('base64');
  const ok = validateImageUploadPayload(
    `data:image/png;base64,${validPngHeader}`,
    'logos'
  );
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.file.extension, '.png');
    assert.equal(ok.file.mimeType, 'image/png');
  }

  const okProof = validateImageUploadPayload(
    `data:image/png;base64,${validPngHeader}`,
    'proofs'
  );
  assert.equal(okProof.ok, true);

  const fakeSvg = Buffer.from('<svg onload="alert(1)"></svg>').toString('base64');
  const blocked = validateImageUploadPayload(
    `data:image/png;base64,${fakeSvg}`,
    'banners'
  );
  assert.equal(blocked.ok, false);
});

test('sanitizeTextFileName prevents path traversal and enforces .txt extension', () => {
  assert.equal(sanitizeTextFileName('../../etc/passwd'), 'passwd.txt');
  assert.equal(sanitizeTextFileName('my account #1.txt'), 'my_account__1.txt');
  assert.equal(sanitizeTextFileName(''), 'account.txt');
});

test('sanitizeDeliveryFields and formatDeliveryAsTextFile produce clean plain text output', () => {
  const fields = sanitizeDeliveryFields([
    { label: 'Email', value: 'user@example.com' },
    { label: '  ', value: 'skip' },
    { label: 'Password', value: 'Secret123' },
  ]);
  assert.deepEqual(fields, [
    { label: 'Email', value: 'user@example.com' },
    { label: 'Password', value: 'Secret123' },
  ]);

  const txt = formatDeliveryAsTextFile('Login at chat.openai.com', fields);
  assert.equal(
    txt,
    'Email: user@example.com\nPassword: Secret123\n\nLogin at chat.openai.com'
  );
});

test('validatePaymentGatewayPayload validates required fields and allowed currencies', () => {
  assert.equal(
    validatePaymentGatewayPayload({
      name: 'EasyPaisa',
      accountNumber: '03001234567',
      currency: 'pkr',
    }).ok,
    true
  );
  assert.equal(
    validatePaymentGatewayPayload({
      name: 'EasyPaisa',
      accountNumber: '03001234567',
      currency: 'EUR',
    }).ok,
    false
  );
  assert.equal(
    validatePaymentGatewayPayload({
      name: '',
      accountNumber: '03001234567',
      currency: 'PKR',
    }).ok,
    false
  );
});

test('validateCheckoutPaymentSelection enforces wallet balance and gateway proof/trxId', () => {
  assert.equal(
    validateCheckoutPaymentSelection({
      method: 'balance',
      walletCredits: 1500,
      grandTotal: 1449,
    }).ok,
    true
  );
  assert.equal(
    validateCheckoutPaymentSelection({
      method: 'balance',
      walletCredits: 500,
      grandTotal: 1449,
    }).ok,
    false
  );
  assert.equal(
    validateCheckoutPaymentSelection({
      method: 'gateway',
      walletCredits: 0,
      grandTotal: 1449,
      gatewayId: 'easypaisa',
      trxId: '',
      proofUrl: '',
    }).ok,
    false
  );
  assert.equal(
    validateCheckoutPaymentSelection({
      method: 'gateway',
      walletCredits: 0,
      grandTotal: 1449,
      gatewayId: 'easypaisa',
      trxId: 'TRX99881122',
    }).ok,
    true
  );
});
