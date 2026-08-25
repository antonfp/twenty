import { type I18n } from '@lingui/core';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';

type WhatIsTwentyProps = {
  i18n: I18n;
};

export const WhatIsTwenty = ({ i18n }: WhatIsTwentyProps) => {
  return (
    <>
      <SubTitle value={i18n._('Что такое ERPilot?')} />
      <MainText>
        {i18n._(
          'Это ERP-конструктор для российского бизнеса: подключайте нужные блоки — продажи, склад, финансы — и ведите дела с помощью ИИ.',
        )}
      </MainText>
    </>
  );
};
