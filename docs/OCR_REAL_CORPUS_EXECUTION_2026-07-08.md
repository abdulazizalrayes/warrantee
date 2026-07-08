# Warrantee Real OCR Corpus Execution - 2026-07-08

Scope: Warrantee only.

## Status

Local redacted OCR QA coverage is now active in the ignored private corpus folder:

```bash
npm run qa:ocr-corpus
npm run qa:ocr-corpus:private
```

Both pass locally. The private corpus currently uses redacted local QA fixtures, not real customer/vendor documents. This is useful for gate repeatability but is not enough to claim full real-document OCR coverage.

## Real Corpus Collection Goal

Collect at least 24 approved real or realistically redacted documents before high-volume OCR launch claims:

- 4 English retail receipts.
- 4 Arabic retail receipts.
- 4 English VAT invoices.
- 4 Arabic VAT invoices.
- 4 mixed Arabic/English invoices.
- 2 warranty certificates.
- 2 poor mobile scans or low-light photos.

Stretch cases:

- multi-page PDF;
- multiple invoices in one PDF;
- duplicate forwarded email chain;
- corrupted PDF;
- missing warranty duration;
- handwritten warranty note.

## Redaction Before Use

Before a file enters `tests/fixtures/ocr-corpus/private`:

- remove buyer names;
- remove phone numbers;
- remove emails;
- remove addresses unless needed for extraction layout;
- remove payment card details;
- remove private QR codes;
- replace real serial/order numbers if they can identify a person or company;
- keep supplier/product/date/warranty layout enough to test extraction.

## Collection Script For Founder Outreach

Message:

Hello, I am testing OCR quality for Warrantee.io, a warranty management platform. Could you share 1-2 old receipts/invoices/warranty certificates after removing personal details such as name, phone, email, address, and payment info? I only need the document layout and fields like supplier, product, date, warranty duration, and invoice number. These files will be used only for private QA and will not be published.

Arabic:

السلام عليكم، أختبر جودة قراءة الفواتير والضمانات في منصة Warrantee.io. هل يمكنك مشاركة فاتورة أو إيصال قديم بعد حذف البيانات الشخصية مثل الاسم والجوال والبريد والعنوان وبيانات الدفع؟ أحتاج فقط شكل المستند وحقول مثل البائع، المنتج، التاريخ، مدة الضمان، ورقم الفاتورة. ستستخدم الملفات للاختبار الخاص فقط ولن تنشر.

## Intake Steps

1. Place approved/redacted files only in:

```text
tests/fixtures/ocr-corpus/private
```

2. Add or update `manifest.json` in that same ignored folder.
3. Run:

```bash
npm run qa:ocr-corpus:private
```

4. If adding provider benchmarking later, use the same manifest for every provider.
5. Record only aggregate counts in docs. Never commit files, extracted text, customer names, or raw OCR output.

## Done Criteria

Real OCR corpus work is complete only when:

- at least 24 approved real/redacted files exist locally;
- all required locales/kinds are represented;
- `npm run qa:ocr-corpus:private` passes;
- parser/OCR results are reviewed manually for false warranty dates, serial numbers, and supplier names;
- any failed class is either fixed or documented as unsupported.

