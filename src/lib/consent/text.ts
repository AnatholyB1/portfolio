import type { Lang } from '@/lib/translations';
import { CONSENT_VERSION } from './constants';

export type ConsentCopy = {
  heading: string;
  body: string;
  link: string;
  accept: string;
  refuse: string;
  error: string;
};

export const CONSENT_TEXT_VERSION = CONSENT_VERSION;

export const CONSENT_TEXT: Record<Lang, ConsentCopy> = {
  fr: {
    heading: 'Votre choix sur les cookies',
    body: "Nous mesurons l'audience du site pour l'améliorer. Avec votre accord, nous utilisons aussi des cookies pour mieux comprendre d'où viennent les visiteurs. Sans votre accord, aucune donnée n'est conservée sur votre appareil. Vous pouvez changer d'avis à tout moment.",
    link: 'En savoir plus',
    accept: 'Accepter',
    refuse: 'Refuser',
    error: "Votre choix n'a pas pu être enregistré. Réessayez.",
  },
  en: {
    heading: 'Your cookie choice',
    body: 'We measure site traffic to improve it. With your consent, we also use cookies to understand where visitors come from. Without your consent, nothing is stored on your device. You can change your mind at any time.',
    link: 'Learn more',
    accept: 'Accept',
    refuse: 'Refuse',
    error: 'Your choice could not be saved. Please try again.',
  },
  th: {
    heading: 'ตัวเลือกคุกกี้ของคุณ',
    body: 'เราวัดการเข้าชมเว็บไซต์เพื่อปรับปรุงบริการ หากคุณยินยอม เราจะใช้คุกกี้เพื่อทำความเข้าใจที่มาของผู้เข้าชมด้วย หากไม่ยินยอม จะไม่มีข้อมูลถูกเก็บในอุปกรณ์ของคุณ คุณเปลี่ยนใจได้ทุกเมื่อ',
    link: 'ดูรายละเอียด',
    accept: 'ยอมรับ',
    refuse: 'ปฏิเสธ',
    error: 'ไม่สามารถบันทึกตัวเลือกของคุณได้ โปรดลองอีกครั้ง',
  },
};
