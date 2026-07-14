import type { Metadata } from 'next';
import { LegalPage } from '@/components/store/LegalPage';

export const metadata: Metadata = { title: 'צור קשר · AURA CLEAN' };

const WA = 'https://wa.me/972502073111';

export default function ContactPage() {
  return (
    <LegalPage
      he={
        <>
          <h1>צור קשר / פרטי העסק</h1>
          <table className="contact-table">
            <tbody>
              <tr><th>שם העסק</th><td>AURA CLEAN מבית SA GROUP</td></tr>
              <tr><th>סוג עוסק</th><td>עוסק פטור</td></tr>
              <tr><th>כתובת</th><td>מגאר</td></tr>
              <tr><th>טלפון</th><td><a href="tel:0502073111" dir="ltr">050-2073111</a></td></tr>
              <tr><th>וואטסאפ להזמנות</th><td><a href={WA} target="_blank" rel="noopener noreferrer" dir="ltr">050-2073111</a></td></tr>
              <tr><th>אימייל</th><td><a href="mailto:sagroup050@gmail.com" dir="ltr">sagroup050@gmail.com</a></td></tr>
              <tr><th>שעות פעילות</th><td>08:00 עד 20:00</td></tr>
            </tbody>
          </table>
          <p className="mt-2"><a className="btn btn-whatsapp btn-lg" href={WA} target="_blank" rel="noopener noreferrer">הזמנה מהירה בוואטסאפ</a></p>
        </>
      }
      ar={
        <>
          <h1>اتصل بنا / تفاصيل النشاط</h1>
          <table className="contact-table">
            <tbody>
              <tr><th>اسم النشاط</th><td>AURA CLEAN من SA GROUP</td></tr>
              <tr><th>نوع النشاط</th><td>تاجر معفى</td></tr>
              <tr><th>العنوان</th><td>المغار</td></tr>
              <tr><th>هاتف</th><td><a href="tel:0502073111" dir="ltr">050-2073111</a></td></tr>
              <tr><th>واتساب للطلبات</th><td><a href={WA} target="_blank" rel="noopener noreferrer" dir="ltr">050-2073111</a></td></tr>
              <tr><th>بريد إلكترونيّ</th><td><a href="mailto:sagroup050@gmail.com" dir="ltr">sagroup050@gmail.com</a></td></tr>
              <tr><th>ساعات العمل</th><td>08:00 حتى 20:00</td></tr>
            </tbody>
          </table>
          <p className="mt-2"><a className="btn btn-whatsapp btn-lg" href={WA} target="_blank" rel="noopener noreferrer">طلب سريع عبر واتساب</a></p>
        </>
      }
    />
  );
}
