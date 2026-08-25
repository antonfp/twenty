#!/usr/bin/env python3
"""E2E цикла закупок ERPilot: счёт поставщика -> проведение -> регистр -> guard
строк -> оплата -> сальдо -> сторно -> смешанное сальдо AR/AP.

Запуск: python3 e2e_purchases.py  (сервер на :3000, workspace ERP Dev, dev-логин).
Скрипт самонастраивается: имена мутаций workspace-схемы берёт интроспекцией.
По образцу e2e_sales.py (Task 5 фазы sales), см. соседний брифу файл.
"""
import json
import random
import string
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

    create_org = find_name(names, 'createOrganization')
    create_company = find_name(names, 'createCompany')
    create_sinv = find_name(names, 'createSupplierInvoice')
    create_sline = find_name(names, 'createSupplierInvoiceLine')
    update_sinv = find_name(names, 'updateSupplierInvoice')
    update_sline = find_name(names, 'updateSupplierInvoiceLine')
    create_spay = find_name(names, 'createSupplierPayment')
    create_salesinv = find_name(names, 'createSalesInvoice')
    create_salesline = find_name(names, 'createSalesInvoiceLine')
    print('mutations:', create_org, create_company, create_sinv, create_sline,
          update_sinv, update_sline, create_spay, create_salesinv, create_salesline)

    # уникальный суффикс на прогон — записи разных запусков не смешиваются
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # 1. Организация + компания-поставщик (и одновременно покупатель — для шага 6)
    org = gql('/graphql', f'''mutation {{ {create_org}(data: {{
      name: "ООО Закупщик (e2e {suffix})", inn: "7728168971", kpp: "772801001",
      bankName: "ПАО Сбербанк", bik: "044525225",
      settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
      directorName: "Петров П. П.", accountantName: "Сидорова А. В."
    }}) {{ id }} }}''', token=token)[create_org]
    print('org:', org['id'])

    comp = gql('/graphql', f'''mutation {{ {create_company}(data: {{
      name: "ООО Поставщик (e2e {suffix})", isSupplier: true, isCustomer: true
    }}) {{ id }} }}''', token=token)[create_company]
    print('supplier/customer company:', comp['id'])

    # 2. Счёт поставщика + 2 строки (10x1000, 1x20000, VAT_20) -> postDocument
    inv = gql('/graphql', f'''mutation {{ {create_sinv}(data: {{
      name: "Черновик e2e", invoiceDate: "2026-08-25",
      organizationId: "{org['id']}", supplierId: "{comp['id']}"
    }}) {{ id docStatus }} }}''', token=token)[create_sinv]
    print('supplier invoice draft:', inv['id'], inv['docStatus'])

    line_ids = []
    for nm, qty, price in [("Партия товара А (e2e)", 10, 1000), ("Партия товара Б (e2e)", 1, 20000)]:
        ln = gql('/graphql', f'''mutation {{ {create_sline}(data: {{
          name: "{nm}", quantity: {qty},
          price: {{ amountMicros: "{price * 1000000}", currencyCode: "RUB" }},
          vatRate: "VAT_20", supplierInvoiceId: "{inv['id']}"
        }}) {{ id }} }}''', token=token)[create_sline]
        line_ids.append(ln['id'])
    print('lines created:', line_ids)

    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "supplierInvoice", recordId: "{inv["id"]}") }}', token=token)
    print('supplier invoice POSTED')

    q = gql('/graphql', f'''{{ supplierInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{
      id name number docStatus total {{ amountMicros }} vatTotal {{ amountMicros }} paymentStatus }} }}''', token=token)['supplierInvoice']
    total = int(q['total']['amountMicros']) / 1e6
    vat = int(q['vatTotal']['amountMicros']) / 1e6
    print(f"invoice: {q['name']} | number={q['number']} | total={total} | vat={vat} | {q['paymentStatus']}")
    assert q['number'].startswith('PI-'), f"number expected PI-..., got {q['number']}"
    assert total == 30000, f'total expected 30000, got {total}'
    assert vat == 5000, f'vat expected 5000 (30000*20/120), got {vat}'

    led = gql('/graphql', f'''{{ partyLedgerEntries(filter: {{ voucherId: {{ eq: "{inv['id']}" }} }}) {{
      edges {{ node {{ amount {{ amountMicros }} isCancelled isCancellation }} }} }} }}''', token=token)
    rows = [e['node'] for e in led['partyLedgerEntries']['edges']]
    assert len(rows) == 1 and int(rows[0]['amount']['amountMicros']) == -30000 * 10**6, rows
    print('ledger -30000 ok')

    # 3. Guard: правка проведённого счёта -> ошибка; правка СТРОКИ проведённого счёта -> ошибка
    guard_doc = gql_raw('/graphql', f'''mutation {{ {update_sinv}(id: "{inv['id']}", data: {{ comment: "hack" }}) {{ id }} }}''', token=token)
    assert guard_doc.get('errors'), 'guard DID NOT block edit of POSTED supplier invoice!'
    print('guard blocks edit of POSTED supplier invoice ok:', guard_doc['errors'][0]['message'][:80])

    guard_line = gql_raw('/graphql', f'''mutation {{ {update_sline}(id: "{line_ids[0]}", data: {{ quantity: 999 }}) {{ id }} }}''', token=token)
    assert guard_line.get('errors'), 'guard DID NOT block edit of a line of a POSTED supplier invoice!'
    print('guard blocks edit of line of POSTED supplier invoice ok:', guard_line['errors'][0]['message'][:80])

    # 4. Оплата 10000 -> PARTIALLY_PAID; оплата 20000 -> PAID; сальдо (не-сторно) = 0
    pay1 = gql('/graphql', f'''mutation {{ {create_spay}(data: {{
      name: "Оплата поставщику 1 (e2e)", paymentDate: "2026-08-25",
      amount: {{ amountMicros: "{10000 * 1000000}", currencyCode: "RUB" }},
      organizationId: "{org['id']}", supplierId: "{comp['id']}", supplierInvoiceId: "{inv['id']}"
    }}) {{ id }} }}''', token=token)[create_spay]
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "supplierPayment", recordId: "{pay1["id"]}") }}', token=token)
    st = gql('/graphql', f'''{{ supplierInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{ paymentStatus }} }}''', token=token)['supplierInvoice']
    assert st['paymentStatus'] == 'PARTIALLY_PAID', st
    print('partial payment ok:', st['paymentStatus'])

    pay2 = gql('/graphql', f'''mutation {{ {create_spay}(data: {{
      name: "Оплата поставщику 2 (e2e)", paymentDate: "2026-08-25",
      amount: {{ amountMicros: "{20000 * 1000000}", currencyCode: "RUB" }},
      organizationId: "{org['id']}", supplierId: "{comp['id']}", supplierInvoiceId: "{inv['id']}"
    }}) {{ id }} }}''', token=token)[create_spay]
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "supplierPayment", recordId: "{pay2["id"]}") }}', token=token)
    st = gql('/graphql', f'''{{ supplierInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{ paymentStatus }} }}''', token=token)['supplierInvoice']
    assert st['paymentStatus'] == 'PAID', st
    print('full payment ok: PAID')

    def live_balance(company_id):
        led = gql('/graphql', f'''{{ partyLedgerEntries(filter: {{ companyId: {{ eq: "{company_id}" }} }}) {{
          edges {{ node {{ amount {{ amountMicros }} isCancelled isCancellation }} }} }} }}''', token=token)
        return sum(int(e['node']['amount']['amountMicros']) for e in led['partyLedgerEntries']['edges']
                   if not e['node']['isCancelled'] and not e['node']['isCancellation']) / 1e6

    balance = live_balance(comp['id'])
    assert balance == 0, f'balance expected 0, got {balance}'
    print('ledger balance 0 ok')

    # 5. cancelDocument второй оплаты -> счёт PARTIALLY_PAID, сторно-запись, живое сальдо -20000
    gql('/graphql', f'mutation {{ cancelDocument(objectNameSingular: "supplierPayment", recordId: "{pay2["id"]}") }}', token=token)
    st = gql('/graphql', f'''{{ supplierInvoice(filter: {{ id: {{ eq: "{inv['id']}" }} }}) {{ paymentStatus }} }}''', token=token)['supplierInvoice']
    assert st['paymentStatus'] == 'PARTIALLY_PAID', f"expected PARTIALLY_PAID after cancel, got {st}"
    print('after cancel pay2: invoice rolled back to', st['paymentStatus'])

    led = gql('/graphql', f'''{{ partyLedgerEntries(filter: {{ companyId: {{ eq: "{comp['id']}" }} }}) {{
      edges {{ node {{ amount {{ amountMicros }} isCancelled isCancellation }} }} }} }}''', token=token)
    storno = [e['node'] for e in led['partyLedgerEntries']['edges'] if e['node']['isCancellation']]
    assert len(storno) == 1, f'expected exactly 1 storno row, got {storno}'
    live = live_balance(comp['id'])
    assert live == -20000, f'live balance expected -20000, got {live}'
    print(f'storno rows: {len(storno)}, live balance: {live} ok')

    # 6. Смешанная проверка: та же компания -- ещё и покупатель. Счёт покупателю на 5000, провести.
    sinv = gql('/graphql', f'''mutation {{ {create_salesinv}(data: {{
      name: "Черновик e2e (AR)", invoiceDate: "2026-08-25",
      organizationId: "{org['id']}", customerId: "{comp['id']}"
    }}) {{ id }} }}''', token=token)[create_salesinv]
    gql('/graphql', f'''mutation {{ {create_salesline}(data: {{
      name: "Услуга (e2e AR)", quantity: 1,
      price: {{ amountMicros: "{5000 * 1000000}", currencyCode: "RUB" }},
      vatRate: "VAT_20", salesInvoiceId: "{sinv['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesInvoice", recordId: "{sinv["id"]}") }}', token=token)

    mixed = live_balance(comp['id'])
    assert mixed == -15000, f'mixed AR+AP balance expected -20000+5000=-15000, got {mixed}'
    print(f'mixed AR/AP balance: {mixed} (-20000+5000=-15000) ok')

    print('\n=== E2E ЦИКЛ ЗАКУПОК ПРОЙДЕН ===')


if __name__ == '__main__':
    try:
        main()
    except AssertionError as e:
        print('ASSERT FAIL:', e)
        sys.exit(1)
    except Exception as e:
        print('FAIL:', e)
        sys.exit(2)
