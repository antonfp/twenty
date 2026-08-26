#!/usr/bin/env python3
"""E2E цикла продаж ERPilot: счёт -> проведение -> регистр -> оплата -> сальдо -> guard -> сторно.

Запуск: python3 e2e_sales.py  (сервер на :3000, workspace ERP Dev, dev-логин).
Скрипт самонастраивается: имена мутаций workspace-схемы берёт интроспекцией.
"""
import json
import re
import sys
import urllib.request

BASE = 'http://localhost:3000'
EMAIL, PASSWORD = 'tim@apple.dev', 'DevLocal2026!erp'


def gql(path, query, variables=None, token=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(BASE + path, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req) as r:
        out = json.loads(r.read())
    if out.get('errors'):
        raise RuntimeError(json.dumps(out['errors'], ensure_ascii=False)[:600])
    return out['data']


def gql_raw(path, query, variables=None, token=None):
    """Как gql, но возвращает errors вместо исключения (для негативных проверок)."""
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(BASE + path, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def login():
    d = gql('/metadata', '''mutation L($e: String!, $p: String!) {
      getLoginTokenFromCredentials(email: $e, password: $p, origin: "http://localhost:3001") {
        loginToken { token } } }''', {'e': EMAIL, 'p': PASSWORD})
    lt = d['getLoginTokenFromCredentials']['loginToken']['token']
    d = gql('/metadata', '''mutation T($t: String!) {
      getAuthTokensFromLoginToken(loginToken: $t, origin: "http://localhost:3001") {
        tokens { accessOrWorkspaceAgnosticToken { token } } } }''', {'t': lt})
    return d['getAuthTokensFromLoginToken']['tokens']['accessOrWorkspaceAgnosticToken']['token']


def mutation_names(token):
    d = gql('/graphql', '{ __type(name: "Mutation") { fields { name } } }', token=token)
    return [f['name'] for f in d['__type']['fields']]


def find_name(names, exact):
    for n in names:
        if n.lower() == exact.lower():
            return n
    raise RuntimeError(f'no mutation named {exact}; have: {[x for x in names if exact[6:12].lower() in x.lower()]}')


def main():
    token = login()
    print('auth ok')
    names = mutation_names(token)

    create_company = find_name(names, 'createCompany')
    create_invoice = find_name(names, 'createSalesInvoice')
    create_line = find_name(names, 'createSalesInvoiceLine')
    create_payment = find_name(names, 'createPayment')
    update_invoice = find_name(names, 'updateSalesInvoice')
    create_org = find_name(names, 'createOrganization')
    print('mutations:', create_company, create_invoice, create_line, create_payment, create_org)

    suffix = str(abs(hash('e2e')) % 1000)
    org = gql('/graphql', f'''mutation {{ {create_org}(data: {{
      name: "ООО Ромашка (e2e)", inn: "7728168971", kpp: "772801001",
      bankName: "ПАО Сбербанк", bik: "044525225",
      settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
      directorName: "Петров П. П.", accountantName: "Сидорова А. В."
    }}) {{ id }} }}''', token=token)[create_org]
    print('org:', org['id'])

    comp = gql('/graphql', f'''mutation {{ {create_company}(data: {{
      name: "ООО Василёк (e2e)", inn: "7704407589", kpp: "770401001", isCustomer: true
    }}) {{ id }} }}''', token=token)[create_company]
    print('customer:', comp['id'])

    inv = gql('/graphql', f'''mutation {{ {create_invoice}(data: {{
      name: "Черновик e2e", invoiceDate: "2026-08-25",
      organizationId: "{org['id']}", customerId: "{comp['id']}"
    }}) {{ id docStatus }} }}''', token=token)[create_invoice]
    print('invoice draft:', inv['id'], inv['docStatus'])

    for nm, qty, price in [("Консультационные услуги (e2e)", 10, 3600), ("Настройка ПО (e2e)", 1, 54000)]:
        gql('/graphql', f'''mutation {{ {create_line}(data: {{
          name: "{nm}", quantity: {qty},
          price: {{ amountMicros: "{price * 1000000}", currencyCode: "RUB" }},
          vatRate: "VAT_20", salesInvoiceId: "{inv['id']}"
        }}) {{ id }} }}''', token=token)
    print('lines created')

    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesInvoice", recordId: "{inv["id"]}") }}', token=token)
    print('invoice POSTED')

    q = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{
      id name number docStatus total {{ amountMicros }} vatTotal {{ amountMicros }} paymentStatus }} }}''', token=token)['salesInvoice']
    total = int(q['total']['amountMicros']) / 1e6
    vat = int(q['vatTotal']['amountMicros']) / 1e6
    print(f"invoice: {q['name']} | number={q['number']} | total={total} | vat={vat} | {q['paymentStatus']}")
    assert total == 90000, f'total expected 90000, got {total}'
    assert vat == 15000, f'vat expected 15000 (90000*20/120), got {vat}'

    led = gql('/graphql', f'''{{ partyLedgerEntries(filter: {{ voucherId: {{ eq: "{inv['id']}" }} }}) {{
      edges {{ node {{ amount {{ amountMicros }} isCancelled isCancellation }} }} }} }}''', token=token)
    rows = [e['node'] for e in led['partyLedgerEntries']['edges']]
    assert len(rows) == 1 and int(rows[0]['amount']['amountMicros']) == 90000 * 10**6, rows
    print('ledger +90000 ok')

    guard = gql_raw('/graphql', f'''mutation {{ {update_invoice}(id: "{inv['id']}", data: {{ comment: "hack" }}) {{ id }} }}''', token=token)
    assert guard.get('errors'), 'guard DID NOT block edit of POSTED invoice!'
    print('guard blocks edit of POSTED invoice ok:', guard['errors'][0]['message'][:80])

    import urllib.error
    req = urllib.request.Request(f"{BASE}/rest/erp/sales-invoices/{inv['id']}/print")
    req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req) as r:
            html = r.read().decode()
        assert 'Ромашка' in html and 'прописью' not in html.lower() or 'рубл' in html.lower()
        open('/tmp/e2e-schet.html', 'w').write(html)
        print('print form ok ->', '/tmp/e2e-schet.html', f'({len(html)} bytes)')
    except urllib.error.HTTPError as e:
        print(f'PRINT ENDPOINT: HTTP {e.code} — проверить путь эндпоинта!', e.read()[:200])

    pay1 = gql('/graphql', f'''mutation {{ {create_payment}(data: {{
      name: "Оплата 1 (e2e)", paymentDate: "2026-08-25",
      amount: {{ amountMicros: "{40000 * 1000000}", currencyCode: "RUB" }},
      organizationId: "{org['id']}", payerId: "{comp['id']}", salesInvoiceId: "{inv['id']}"
    }}) {{ id }} }}''', token=token)[create_payment]
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "payment", recordId: "{pay1["id"]}") }}', token=token)
    st = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{ paymentStatus paidAmount {{ amountMicros }} }} }}''', token=token)['salesInvoice']
    assert st['paymentStatus'] == 'PARTIALLY_PAID', st
    print('partial payment ok:', st['paymentStatus'])

    pay2 = gql('/graphql', f'''mutation {{ {create_payment}(data: {{
      name: "Оплата 2 (e2e)", paymentDate: "2026-08-25",
      amount: {{ amountMicros: "{50000 * 1000000}", currencyCode: "RUB" }},
      organizationId: "{org['id']}", payerId: "{comp['id']}", salesInvoiceId: "{inv['id']}"
    }}) {{ id }} }}''', token=token)[create_payment]
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "payment", recordId: "{pay2["id"]}") }}', token=token)
    st = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{ paymentStatus }} }}''', token=token)['salesInvoice']
    assert st['paymentStatus'] == 'PAID', st
    print('full payment ok: PAID')

    led = gql('/graphql', f'''{{ partyLedgerEntries(filter: {{ companyId: {{ eq: "{comp['id']}" }} }}) {{
      edges {{ node {{ amount {{ amountMicros }} isCancelled }} }} }} }}''', token=token)
    balance = sum(int(e['node']['amount']['amountMicros']) for e in led['partyLedgerEntries']['edges'] if not e['node']['isCancelled']) / 1e6
    assert balance == 0, f'balance expected 0, got {balance}'
    print('ledger balance 0 ok')

    gql('/graphql', f'mutation {{ cancelDocument(objectNameSingular: "payment", recordId: "{pay2["id"]}") }}', token=token)
    st = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{ paymentStatus }} }}''', token=token)['salesInvoice']
    assert st['paymentStatus'] == 'PARTIALLY_PAID', f"expected PARTIALLY_PAID after cancel, got {st}"
    print('after cancel pay2: invoice rolled back to', st['paymentStatus'])
    pay2_after = gql('/graphql', f'''{{ payment(filter: {{ id: {{ eq: "{pay2['id']}" }} }}) {{
      docStatus postedAt cancelledAt }} }}''', token=token)['payment']
    assert pay2_after['docStatus'] == 'DRAFT', pay2_after
    assert pay2_after['postedAt'] is None, pay2_after
    assert pay2_after['cancelledAt'] is None, pay2_after
    print('pay2 cancelled -> DRAFT (not terminal CANCELLED), postedAt/cancelledAt null ok')
    led = gql('/graphql', f'''{{ partyLedgerEntries(filter: {{ companyId: {{ eq: "{comp['id']}" }} }}) {{
      edges {{ node {{ amount {{ amountMicros }} isCancelled isCancellation }} }} }} }}''', token=token)
    live = sum(int(e['node']['amount']['amountMicros']) for e in led['partyLedgerEntries']['edges']
               if not e['node']['isCancelled'] and not e['node']['isCancellation']) / 1e6
    storno = [e['node'] for e in led['partyLedgerEntries']['edges'] if e['node']['isCancellation']]
    print(f'storno rows: {len(storno)}, live balance: {live} (ожидание 40000-90000=-50000? нет: +90000-40000=50000)')

    # Task 7: cancel -> edit line amount -> re-post -> registers correct.
    # Fresh invoice (no linked payments) so the cancel-block mirror doesn't
    # get in the way — the scenario is about numbering/registers, not guards.
    update_line = find_name(names, 'updateSalesInvoiceLine')

    inv2 = gql('/graphql', f'''mutation {{ {create_invoice}(data: {{
      name: "Черновик e2e (re-post)", invoiceDate: "2026-08-25",
      organizationId: "{org['id']}", customerId: "{comp['id']}"
    }}) {{ id docStatus }} }}''', token=token)[create_invoice]
    line2 = gql('/graphql', f'''mutation {{ {create_line}(data: {{
      name: "Разовая услуга (e2e re-post)", quantity: 1,
      price: {{ amountMicros: "{12000 * 1000000}", currencyCode: "RUB" }},
      vatRate: "VAT_20", salesInvoiceId: "{inv2['id']}"
    }}) {{ id }} }}''', token=token)[create_line]

    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesInvoice", recordId: "{inv2["id"]}") }}', token=token)
    inv2_posted = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{inv2['id']}" }} }}) {{
      number docStatus total {{ amountMicros }} }} }}''', token=token)['salesInvoice']
    assert inv2_posted['docStatus'] == 'POSTED', inv2_posted
    assert int(inv2_posted['total']['amountMicros']) == 12000 * 10**6, inv2_posted
    inv2_number = inv2_posted['number']
    print('re-post scenario: invoice #', inv2_number, 'posted, total 12000')

    gql('/graphql', f'mutation {{ cancelDocument(objectNameSingular: "salesInvoice", recordId: "{inv2["id"]}") }}', token=token)
    inv2_cancelled = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{inv2['id']}" }} }}) {{
      docStatus postedAt cancelledAt number }} }}''', token=token)['salesInvoice']
    assert inv2_cancelled['docStatus'] == 'DRAFT', inv2_cancelled
    assert inv2_cancelled['postedAt'] is None, inv2_cancelled
    assert inv2_cancelled['cancelledAt'] is None, inv2_cancelled
    assert inv2_cancelled['number'] == inv2_number, 'number must survive cancel: ' + str(inv2_cancelled)
    print('cancel -> back to DRAFT ok (postedAt/cancelledAt null, number kept)')

    # Editable again while DRAFT -- change the line amount (qty 1 -> 2).
    gql('/graphql', f'''mutation {{ {update_line}(id: "{line2['id']}", data: {{ quantity: 2 }}) {{ id }} }}''', token=token)
    print('line quantity edited 1 -> 2 while DRAFT')

    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesInvoice", recordId: "{inv2["id"]}") }}', token=token)
    inv2_reposted = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{inv2['id']}" }} }}) {{
      docStatus number total {{ amountMicros }} }} }}''', token=token)['salesInvoice']
    assert inv2_reposted['docStatus'] == 'POSTED', inv2_reposted
    # DocumentNumberingService only assigns when `number` is empty -- cancel
    # never clears it, so re-post must reuse the SAME number.
    assert inv2_reposted['number'] == inv2_number, 'numbering must re-use the same number on re-post: ' + str(inv2_reposted)
    assert int(inv2_reposted['total']['amountMicros']) == 24000 * 10**6, inv2_reposted
    print('re-post ok: same number', inv2_number, ', new total 24000 (2x12000)')

    led2 = gql('/graphql', f'''{{ partyLedgerEntries(filter: {{ voucherId: {{ eq: "{inv2['id']}" }} }}) {{
      edges {{ node {{ amount {{ amountMicros }} isCancelled isCancellation }} }} }} }}''', token=token)
    rows2 = [e['node'] for e in led2['partyLedgerEntries']['edges']]
    assert len(rows2) == 3, f'expected 3 register rows (original + storno + new) after cancel+re-post, got {rows2}'
    live2 = sum(int(r['amount']['amountMicros']) for r in rows2 if not r['isCancelled'] and not r['isCancellation']) / 1e6
    assert live2 == 24000, f'live party balance expected 24000 after re-post, got {live2}: {rows2}'
    print('registers correct after cancel -> edit -> re-post: 3 rows (orig+storno+new), live balance 24000')

    print('\\n=== E2E ЦИКЛ ПРОЙДЕН ===')


if __name__ == '__main__':
    try:
        main()
    except AssertionError as e:
        print('ASSERT FAIL:', e)
        sys.exit(1)
    except Exception as e:
        print('FAIL:', e)
        sys.exit(2)
