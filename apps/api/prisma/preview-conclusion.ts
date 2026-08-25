import { writeFileSync } from 'node:fs';
import { ConclusionPdfService } from '../src/modules/video-visits/conclusion-pdf.service';

/** ნიმუში ვიზუალური შემოწმებისთვის. */
(async () => {
  const pdf = await new ConclusionPdfService().render({
    visitDate: new Date('2026-08-26T14:30:00+04:00'),
    concludedAt: new Date('2026-08-26T15:05:00+04:00'),
    parentName: 'უტა ბუზიაშვილი',
    parentPhone: '+995 574 528 091',
    parentRoleLabel: 'მამა',
    childName: 'გიორგი ბუზიაშვილი',
    childBirthDate: new Date('2024-10-15'),
    doctorName: 'თეონა ტაბატაძე',
    diagnosis: 'წითურა',
    diagnosisNote:
      'წითურა მწვავე ვირუსული ინფექციაა, რომელიც წვრილი ვარდისფერი გამონაყარით, '
      + 'მსუბუქი ცხელებითა და კისრის უკანა ლიმფური კვანძების გადიდებით მიმდინარეობს. '
      + 'ბავშვებში ჩვეულებრივ მსუბუქად მიმდინარეობს და 3–5 დღეში გამონაყარი ქრება. '
      + 'ავადმყოფი გადამდებია გამონაყარის გაჩენამდე 7 დღით ადრე და მისი გაჩენიდან '
      + '7 დღის განმავლობაში.',
    prescription:
      'რეჟიმი: სახლის რეჟიმი გამონაყარის გაჩენიდან 7 დღე. ორსულ ქალებთან კონტაქტი '
      + 'დაუშვებელია.\n\n'
      + 'პარაცეტამოლი — 120–180 მგ (5–7.5 მლ სიროფი 120 მგ/5 მლ), დღეში 4-ჯერ, '
      + 'ცხელებაზე 38°C-ის ზემოთ.\n\n'
      + 'უხვი სითხე. გრილი და ნოტიო ოთახი.\n\n'
      + 'კონტროლი 5 დღეში. ძლიერი თავის ტკივილი, ღებინება ან კისრის კუნთების '
      + 'დაჭიმულობა — დაუყოვნებლივ ექიმთან.',
    weightKg: 12.4,
    heightCm: 84,
  });

  const out = `${process.env.HOME}/Desktop/askdrteo-danishnuleba-nimushi.pdf`;
  writeFileSync(out, pdf);
  console.log(`PDF: ${out} (${Math.round(pdf.length / 1024)} KB)`);
})().catch((e: Error) => { console.error(e.message); process.exit(1); });
