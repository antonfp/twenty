#!/usr/bin/env python3
"""E2E цикла бухгалтерии ERPilot: поступление -> счёт покупателю (НДС 22%) ->
реализация -> оплата -> ручная операция -> ОСВ -> lockDate (отказы) ->
импорт банковской выписки (CP1251, идемпотентность) -> сторно ручной
операции (проводки реверсированы) -> регресс sales/purchases/stock.

Запуск: python3 e2e_accounting.py  (сервер на :3000, workspace ERP Dev,
dev-логин). Скрипт самонастраивается: имена мутаций workspace-схемы берёт
интроспекцией. По образцу e2e_stock.py / e2e_sales.py / e2e_purchases.py.
"""
import datetime
import json
import random
import string
import sys
import urllib.error
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


def money(rub):
    return f'{{ amountMicros: "{int(round(rub * 1000000))}", currencyCode: "RUB" }}'


def get_extension_message(err_response):
    """userFriendlyMessage (русский, с именами) лежит в extensions, а не в message —
    сырой английский message с UUID-ами кладётся GraphQL error handler'ом
    отдельно (см. generate-graphql-error-from-error.util.ts)."""
    errors = err_response.get('errors') or []
    assert errors, f'expected GraphQL errors, got {err_response}'
    ext = errors[0].get('extensions') or {}
    msg = ext.get('userFriendlyMessage') or errors[0].get('message', '')
    return msg


def random_inn():
    return ''.join(random.choices(string.digits, k=10))


def main():
    token = login()
    print('auth ok')
    names = mutation_names(token)

    create_org = find_name(names, 'createOrganization')
    update_org = find_name(names, 'updateOrganization')
    create_company = find_name(names, 'createCompany')
    create_item = find_name(names, 'createItem')
    create_warehouse = find_name(names, 'createWarehouse')
    create_gr = find_name(names, 'createGoodsReceipt')
    create_gr_line = find_name(names, 'createGoodsReceiptLine')
    create_sinv = find_name(names, 'createSalesInvoice')
    create_sinv_line = find_name(names, 'createSalesInvoiceLine')
    create_ss = find_name(names, 'createSalesShipment')
    create_ss_line = find_name(names, 'createSalesShipmentLine')
    create_payment = find_name(names, 'createPayment')
    create_me = find_name(names, 'createManualEntry')
    create_me_line = find_name(names, 'createManualEntryLine')
    print('mutations:', create_org, create_sinv, create_ss, create_payment, create_me)

    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # 0. План счетов: коды -> id (справочник уже засеян post-install приложения).
    acc_rows = gql('/graphql', '{ accounts(first: 200) { edges { node { id code } } } }',
                   token=token)['accounts']['edges']
    accounts = {e['node']['code']: e['node']['id'] for e in acc_rows}
    for code in ('41.01', '60.01', '62.01', '90.01.1', '90.02.1', '90.03', '68.02', '51', '26', '71'):
        assert code in accounts, f'account {code} missing from chart of accounts'

    def gl_entries(voucher_id):
        d = gql('/graphql', f'''{{ glEntries(filter: {{ voucherId: {{ eq: "{voucher_id}" }} }}) {{
          edges {{ node {{ amount {{ amountMicros }} isCancelled isCancellation
            debitAccount {{ code }} creditAccount {{ code }} }} }} }} }}''', token=token)['glEntries']
        return [e['node'] for e in d['edges']]

    def assert_gl_row(rows, debit_code, credit_code, amount_rub, label):
        live = [r for r in rows if not r['isCancelled'] and not r['isCancellation']]
        matches = [r for r in live if r['debitAccount']['code'] == debit_code
                   and r['creditAccount']['code'] == credit_code]
        assert len(matches) == 1, f'{label}: expected 1 row Дт{debit_code}/Кт{credit_code}, got {rows}'
        got = int(matches[0]['amount']['amountMicros']) / 1e6
        assert got == amount_rub, f'{label}: Дт{debit_code}/Кт{credit_code} expected {amount_rub}, got {got}'

    # 1. Организация (свежий ИНН — нужен для импорта выписки) + контрагент + товар + склад.
    org_inn = random_inn()
    org = gql('/graphql', f'''mutation {{ {create_org}(data: {{
      name: "ООО Бухгалтерия-Тест (e2e {suffix})", inn: "{org_inn}", kpp: "772801001",
      bankName: "ПАО Сбербанк", bik: "044525225",
      settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
      directorName: "Петров П. П.", accountantName: "Сидорова А. В."
    }}) {{ id name }} }}''', token=token)[create_org]
    print('org:', org['id'], 'inn', org_inn)

    counterparty_inn = random_inn()
    comp = gql('/graphql', f'''mutation {{ {create_company}(data: {{
      name: "ООО Контрагент (e2e {suffix})", inn: "{counterparty_inn}",
      isCustomer: true, isSupplier: true
    }}) {{ id name }} }}''', token=token)[create_company]
    print('counterparty:', comp['id'], 'inn', counterparty_inn)

    warehouse = gql('/graphql', f'''mutation {{ {create_warehouse}(data: {{
      name: "Склад Бух (e2e {suffix})"
    }}) {{ id }} }}''', token=token)[create_warehouse]

    item_name = f'Товар для бухгалтерии (e2e {suffix})'
    item = gql('/graphql', f'''mutation {{ {create_item}(data: {{
      name: "{item_name}", itemType: "GOODS", unit: "PIECE"
    }}) {{ id }} }}''', token=token)[create_item]
    print('warehouse:', warehouse['id'], '| item:', item['id'])

    # 2. Поступление 10 x 100 -> проведение -> Дт41.01/Кт60.01 = 1000.
    gr = gql('/graphql', f'''mutation {{ {create_gr}(data: {{
      organizationId: "{org['id']}", warehouseId: "{warehouse['id']}"
    }}) {{ id }} }}''', token=token)[create_gr]
    gql('/graphql', f'''mutation {{ {create_gr_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 10,
      price: {money(100)}, goodsReceiptId: "{gr['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "goodsReceipt", recordId: "{gr["id"]}") }}', token=token)
    gr_rows = gl_entries(gr['id'])
    assert_gl_row(gr_rows, '41.01', '60.01', 1000, 'GR')
    print('GR POSTED: Дт41.01/Кт60.01=1000 ok')

    # 3. Счёт покупателю 1220 с НДС 22% -> Дт62.01/Кт90.01.1=1220, Дт90.03/Кт68.02=220
    #    (1220 x 22 / 122 = 220 ровно).
    today = datetime.date.today()
    today_iso = today.isoformat()
    sinv = gql('/graphql', f'''mutation {{ {create_sinv}(data: {{
      name: "Черновик e2e", invoiceDate: "{today_iso}",
      organizationId: "{org['id']}", customerId: "{comp['id']}"
    }}) {{ id }} }}''', token=token)[create_sinv]
    gql('/graphql', f'''mutation {{ {create_sinv_line}(data: {{
      name: "{item_name}", quantity: 1,
      price: {money(1220)}, vatRate: "VAT_22", salesInvoiceId: "{sinv['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesInvoice", recordId: "{sinv["id"]}") }}', token=token)
    sinv_q = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{sinv['id']}" }} }}) {{
      total {{ amountMicros }} vatTotal {{ amountMicros }} }} }}''', token=token)['salesInvoice']
    assert int(sinv_q['total']['amountMicros']) / 1e6 == 1220, sinv_q
    assert int(sinv_q['vatTotal']['amountMicros']) / 1e6 == 220, sinv_q
    sinv_rows = gl_entries(sinv['id'])
    assert_gl_row(sinv_rows, '62.01', '90.01.1', 1220, 'SalesInvoice')
    assert_gl_row(sinv_rows, '90.03', '68.02', 220, 'SalesInvoice VAT')
    print('SalesInvoice POSTED: Дт62.01/Кт90.01.1=1220, Дт90.03/Кт68.02=220 ok')

    # 4. Реализация 4 шт (средняя себестоимость 100, единственное поступление)
    #    -> Дт90.02.1/Кт41.01 = 400.
    ss = gql('/graphql', f'''mutation {{ {create_ss}(data: {{
      organizationId: "{org['id']}", warehouseId: "{warehouse['id']}",
      customerId: "{comp['id']}", salesInvoiceId: "{sinv['id']}"
    }}) {{ id }} }}''', token=token)[create_ss]
    gql('/graphql', f'''mutation {{ {create_ss_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 4,
      price: {money(305)}, amount: {money(1220)}, vatRate: "VAT_22",
      salesShipmentId: "{ss['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesShipment", recordId: "{ss["id"]}") }}', token=token)
    ss_q = gql('/graphql', f'''{{ salesShipment(filter: {{ id: {{ eq: "{ss['id']}" }} }}) {{
      totalCost {{ amountMicros }} }} }}''', token=token)['salesShipment']
    assert int(ss_q['totalCost']['amountMicros']) / 1e6 == 400, ss_q
    ss_rows = gl_entries(ss['id'])
    assert_gl_row(ss_rows, '90.02.1', '41.01', 400, 'SalesShipment')
    print('SalesShipment POSTED: Дт90.02.1/Кт41.01=400 (по средней 100) ok')

    # 5. Оплата 1220 -> Дт51/Кт62.01 = 1220.
    pay = gql('/graphql', f'''mutation {{ {create_payment}(data: {{
      name: "Оплата (e2e)", paymentDate: "{today_iso}",
      amount: {money(1220)}, organizationId: "{org['id']}",
      payerId: "{comp['id']}", salesInvoiceId: "{sinv['id']}"
    }}) {{ id }} }}''', token=token)[create_payment]
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "payment", recordId: "{pay["id"]}") }}', token=token)
    pay_rows = gl_entries(pay['id'])
    assert_gl_row(pay_rows, '51', '62.01', 1220, 'Payment')
    sinv_after_pay = gql('/graphql', f'''{{ salesInvoice(filter: {{ id: {{ eq: "{sinv['id']}" }} }}) {{
      paymentStatus }} }}''', token=token)['salesInvoice']
    assert sinv_after_pay['paymentStatus'] == 'PAID', sinv_after_pay
    print('Payment POSTED: Дт51/Кт62.01=1220 ok, invoice PAID')

    # 6. Ручная операция Дт26 Кт71 500 (эта же операция сторнируется в конце).
    me = gql('/graphql', f'''mutation {{ {create_me}(data: {{
      organizationId: "{org['id']}"
    }}) {{ id }} }}''', token=token)[create_me]
    gql('/graphql', f'''mutation {{ {create_me_line}(data: {{
      name: "Списание подотчётных сумм (e2e)", amount: {money(500)},
      debitAccountId: "{accounts['26']}", creditAccountId: "{accounts['71']}",
      manualEntryId: "{me['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "manualEntry", recordId: "{me["id"]}") }}', token=token)
    me_q = gql('/graphql', f'''{{ manualEntry(filter: {{ id: {{ eq: "{me['id']}" }} }}) {{
      number docStatus }} }}''', token=token)['manualEntry']
    assert me_q['number'].startswith('ME-'), me_q
    assert me_q['docStatus'] == 'POSTED', me_q
    me_rows = gl_entries(me['id'])
    assert_gl_row(me_rows, '26', '71', 500, 'ManualEntry')
    print(f"ManualEntry {me_q['number']} POSTED: Дт26/Кт71=500 ok")

    # 7. ОСВ за сегодня (все проводки датированы датой проведения = сегодня,
    #    т.к. postingDate ни у одного из документов выше не задавался явно).
    #    Ручной расчёт: обороты Дт = обороты Кт = 1000+1220+220+400+1220+500 = 4560;
    #    сальдо 41.01 = 1000-400=600; 62.01 = 1220-1220=0; 51 = 1220 (единственное движение).
    body = json.dumps({
        'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
        'params': {
            'name': 'trial_balance',
            'arguments': {'organizationId': org['id'], 'dateFrom': today_iso, 'dateTo': today_iso},
        },
    }).encode()
    req = urllib.request.Request(BASE + '/mcp', data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req) as r:
        rpc = json.loads(r.read())
    assert 'result' in rpc and not rpc['result'].get('isError'), rpc
    tb = json.loads(rpc['result']['content'][0]['text'])

    totals = tb['totals']
    assert totals['turnoverDebit'] == totals['turnoverCredit'] == 456000, \
        f'turnover Дт/Кт expected 4560.00 each, got {totals}'

    by_code = {row['accountCode']: row for row in tb['rows']}

    def closing_balance_kopecks(code):
        row = by_code[code]
        return row['closingDebit'] - row['closingCredit']

    assert closing_balance_kopecks('41.01') == 60000, by_code['41.01']  # 600 руб
    assert closing_balance_kopecks('62.01') == 0, by_code['62.01']
    assert closing_balance_kopecks('51') == 122000, by_code['51']  # 1220 руб
    print(f"ОСВ (MCP trial_balance) ok: обороты Дт=Кт={totals['turnoverDebit']/100} руб, "
          f"41.01={closing_balance_kopecks('41.01')/100}, 62.01={closing_balance_kopecks('62.01')/100}, "
          f"51={closing_balance_kopecks('51')/100}")

    # 8. lockDate: отдельная ручная операция с postingDate=вчера, проводится
    #    ПОКА lockDate ещё не установлен (период открыт).
    yesterday = today - datetime.timedelta(days=1)
    day_before = today - datetime.timedelta(days=2)
    yesterday_iso = yesterday.isoformat()
    day_before_iso = day_before.isoformat()

    lock_me = gql('/graphql', f'''mutation {{ {create_me}(data: {{
      organizationId: "{org['id']}", postingDate: "{yesterday_iso}"
    }}) {{ id }} }}''', token=token)[create_me]
    gql('/graphql', f'''mutation {{ {create_me_line}(data: {{
      name: "Тест lockDate (e2e)", amount: {money(1)},
      debitAccountId: "{accounts['26']}", creditAccountId: "{accounts['71']}",
      manualEntryId: "{lock_me['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "manualEntry", recordId: "{lock_me["id"]}") }}', token=token)
    print(f'lock-test ME POSTED with postingDate={yesterday_iso} (period still open) ok')

    # Закрываем период по вчера включительно.
    gql('/graphql', f'''mutation {{ {update_org}(id: "{org['id']}", data: {{
      lockDate: "{yesterday_iso}"
    }}) {{ id }} }}''', token=token)
    print('lockDate set to', yesterday_iso)

    # 8a. Попытка проведения документа с postingDate позавчера -> RU-отказ.
    post_test_me = gql('/graphql', f'''mutation {{ {create_me}(data: {{
      organizationId: "{org['id']}", postingDate: "{day_before_iso}"
    }}) {{ id }} }}''', token=token)[create_me]
    gql('/graphql', f'''mutation {{ {create_me_line}(data: {{
      name: "Тест lockDate — задним числом (e2e)", amount: {money(1)},
      debitAccountId: "{accounts['26']}", creditAccountId: "{accounts['71']}",
      manualEntryId: "{post_test_me['id']}"
    }}) {{ id }} }}''', token=token)
    fail = gql_raw('/graphql', f'mutation {{ postDocument(objectNameSingular: "manualEntry", recordId: "{post_test_me["id"]}") }}', token=token)
    fail_msg = get_extension_message(fail)
    assert 'Период закрыт' in fail_msg, fail_msg
    assert org['name'] in fail_msg, fail_msg
    post_test_after = gql('/graphql', f'''{{ manualEntry(filter: {{ id: {{ eq: "{post_test_me['id']}" }} }}) {{
      docStatus }} }}''', token=token)['manualEntry']
    assert post_test_after['docStatus'] == 'DRAFT', 'blocked post must not have side effects: ' + str(post_test_after)
    print('post with postingDate позавчера blocked:', fail_msg[:120])

    # 8b. Попытка отмены документа, проведённого с postingDate <= lockDate -> RU-отказ.
    fail2 = gql_raw('/graphql', f'mutation {{ cancelDocument(objectNameSingular: "manualEntry", recordId: "{lock_me["id"]}") }}', token=token)
    fail2_msg = get_extension_message(fail2)
    assert 'Период закрыт' in fail2_msg, fail2_msg
    lock_me_after = gql('/graphql', f'''{{ manualEntry(filter: {{ id: {{ eq: "{lock_me['id']}" }} }}) {{
      docStatus }} }}''', token=token)['manualEntry']
    assert lock_me_after['docStatus'] == 'POSTED', 'blocked cancel must not have side effects: ' + str(lock_me_after)
    print('cancel of document posted before lockDate blocked:', fail2_msg[:120])

    # Снимаем lockDate — иначе сторно ManualEntry (шаг 6, postingDate=сегодня
    # по умолчанию) упрётся, если сегодняшняя дата когда-либо совпадёт с
    # запертым периодом; снимаем всегда, для чистоты последующих шагов.
    gql('/graphql', f'''mutation {{ {update_org}(id: "{org['id']}", data: {{
      lockDate: null
    }}) {{ id }} }}''', token=token)
    print('lockDate unset (null) ok')

    # 9. Импорт банковской выписки (1CClientBankExchange, CP1251): 1 входящая
    #    на наш ИНН, 1 исходящая, 1 дубль-строка входящей -> 2 DRAFT создано,
    #    1 пропуск (обнаружен в той же транзакции импорта).
    date_ru = today.strftime('%d.%m.%Y')

    def payment_block(number, amount_rub, payer_inn, payer_name, payee_inn, payee_name, purpose):
        return '\n'.join([
            'СекцияДокумент=Платежное поручение',
            f'Номер={number}',
            f'Дата={date_ru}',
            f'Сумма={amount_rub}.00',
            f'ПлательщикИНН={payer_inn}',
            f'Плательщик1={payer_name}',
            f'ПолучательИНН={payee_inn}',
            f'Получатель1={payee_name}',
            f'НазначениеПлатежа={purpose}',
            'КонецДокумента',
        ])

    incoming = payment_block(1, 1000, counterparty_inn, comp['name'], org_inn, org['name'], 'Оплата по договору (e2e)')
    outgoing = payment_block(2, 500, org_inn, org['name'], counterparty_inn, comp['name'], 'Оплата поставщику (e2e)')
    duplicate_of_incoming = incoming  # дубль-строка: те же Номер/Дата/Сумма/контрагент -> должна быть пропущена

    statement_text = '\n'.join([
        '1CClientBankExchange',
        'ВерсияФормата=1.03',
        'Кодировка=Windows-1251',
        incoming,
        outgoing,
        duplicate_of_incoming,
        'КонецФайла',
    ])
    statement_bytes = statement_text.encode('cp1251')

    import_req = urllib.request.Request(
        f"{BASE}/rest/erp/bank-statements/import?organizationId={org['id']}",
        data=statement_bytes, method='POST')
    import_req.add_header('Authorization', 'Bearer ' + token)
    import_req.add_header('Content-Type', 'text/plain')
    with urllib.request.urlopen(import_req) as r:
        report = json.loads(r.read())
    assert report['errors'] == [], report
    assert len(report['created']) == 2, report
    assert len(report['skipped']) == 1, report
    created_types = sorted(c['type'] for c in report['created'])
    assert created_types == ['payment', 'supplierPayment'], report
    print(f"bank import: created={len(report['created'])} skipped={len(report['skipped'])} ok "
          f"({[c['type'] for c in report['created']]})")

    # Повторный импорт того же файла -> идемпотентность: все 3 строки уже
    # существуют (первые 2 как DRAFT, дубль совпадает с первой) -> 0 создано.
    import_req2 = urllib.request.Request(
        f"{BASE}/rest/erp/bank-statements/import?organizationId={org['id']}",
        data=statement_bytes, method='POST')
    import_req2.add_header('Authorization', 'Bearer ' + token)
    import_req2.add_header('Content-Type', 'text/plain')
    with urllib.request.urlopen(import_req2) as r:
        report2 = json.loads(r.read())
    assert report2['created'] == [], report2
    assert len(report2['skipped']) == 3, report2
    print(f"bank re-import (idempotent): created={len(report2['created'])} skipped={len(report2['skipped'])} ok")

    # 10. Сторно ManualEntry (шаг 6) -> glEntry реверс, сумма по voucherId = 0.
    gql('/graphql', f'mutation {{ cancelDocument(objectNameSingular: "manualEntry", recordId: "{me["id"]}") }}', token=token)
    me_after = gql('/graphql', f'''{{ manualEntry(filter: {{ id: {{ eq: "{me['id']}" }} }}) {{
      docStatus cancelledAt }} }}''', token=token)['manualEntry']
    assert me_after['docStatus'] == 'CANCELLED', me_after
    assert me_after['cancelledAt'] is not None, me_after
    me_rows_after = gl_entries(me['id'])
    originals = [r for r in me_rows_after if not r['isCancellation']]
    reversals = [r for r in me_rows_after if r['isCancellation']]
    assert len(originals) == 1 and len(reversals) == 1, me_rows_after
    total_micros = sum(int(r['amount']['amountMicros']) for r in me_rows_after)
    assert total_micros == 0, me_rows_after
    print('storno ManualEntry ok: docStatus=CANCELLED, Σ glEntry.amount по voucherId = 0')

    print('\n=== E2E ЦИКЛ БУХГАЛТЕРИИ ПРОЙДЕН ===')


if __name__ == '__main__':
    try:
        main()
    except AssertionError as e:
        print('ASSERT FAIL:', e)
        sys.exit(1)
    except urllib.error.HTTPError as e:
        print('HTTP FAIL:', e.code, e.read()[:600])
        sys.exit(2)
    except Exception as e:
        print('FAIL:', e)
        sys.exit(2)
