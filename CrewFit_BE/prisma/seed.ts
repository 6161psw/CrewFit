import { ContestCategory, ContestScope, DocumentType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const REGION = '광주·전남';
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

const defaultDocs = [
  { type: DocumentType.ROSTER, title: '팀 명단', description: '팀 정보로 자동 작성' },
  { type: DocumentType.ENROLLMENT, title: '재학 확인', description: '학교 인증으로 대체' },
  { type: DocumentType.APPLICATION_FORM, title: '참가 신청서 (학교 양식)', description: '팀 정보로 자동 작성' },
  { type: DocumentType.FILE, title: '아이디어 요약서 (2쪽 이내)', description: '팀장이 PDF 업로드' },
  { type: DocumentType.CONSENT, title: '개인정보 수집·이용 동의서', description: '팀원 전원 서명' },
];

async function main() {
  const schools = [
    { name: 'GIST (광주과학기술원)', shortName: 'GIST', emailDomains: ['gm.gist.ac.kr', 'gist.ac.kr'] },
    { name: '전남대학교', shortName: '전남대', emailDomains: ['jnu.ac.kr'] },
    { name: '조선대학교', shortName: '조선대', emailDomains: ['chosun.ac.kr', 'chosun.kr'] },
    { name: '한국에너지공과대학교 (KENTECH)', shortName: 'KENTECH', emailDomains: ['kentech.ac.kr'] },
  ];
  for (const s of schools) {
    await prisma.school.upsert({
      where: { name: s.name },
      update: s,
      create: { ...s, region: REGION, licenseExpiresAt: new Date('2027-02-28T23:59:59+09:00') },
    });
  }
  const gist = await prisma.school.findUniqueOrThrow({ where: { name: schools[0].name } });

  if ((await prisma.contest.count()) > 0) return;

  const contests = [
    { title: 'GIST 교내 해커톤 2026', organizer: 'GIST 학생회', category: ContestCategory.HACKATHON, tags: ['해커톤', '개발', '48시간'], scope: ContestScope.SCHOOL, schoolId: gist.id, minTeamSize: 2, maxTeamSize: 4, deadline: days(5), submitTo: 'GIST 학생회' },
    { title: '2026 GIST 창업아이디어 경진대회', organizer: 'GIST 창업진흥센터', category: ContestCategory.STARTUP, tags: ['창업', '아이디어', '피칭'], scope: ContestScope.SCHOOL, schoolId: gist.id, minTeamSize: 3, maxTeamSize: 5, deadline: days(10), submitTo: 'GIST 창업진흥센터', operatorName: '○○이벤트', operatorEmail: 'operator@example.com' },
    { title: '학부생 연구 아이디어 공모전', organizer: 'GIST 교무처', category: ContestCategory.RESEARCH, tags: ['연구', '신소재', '배터리'], scope: ContestScope.SCHOOL, schoolId: gist.id, minTeamSize: 1, maxTeamSize: 3, deadline: days(14), submitTo: 'GIST 교무처' },
    { title: '창업동아리 데모데이', organizer: '교내 창업동아리 연합', category: ContestCategory.DEMO, tags: ['데모', '창업', '발표'], scope: ContestScope.SCHOOL, schoolId: gist.id, minTeamSize: 2, maxTeamSize: 5, deadline: days(20), submitTo: 'GIST 창업진흥센터' },
    { title: '2026 광주·전남 연합 창업리그', organizer: '광주·전남 RISE 센터', category: ContestCategory.STARTUP, tags: ['창업', '연합', '지역'], scope: ContestScope.REGION, region: REGION, minTeamSize: 3, maxTeamSize: 5, deadline: days(25), submitTo: '광주·전남 RISE 센터' },
    { title: '대학생 AI 서비스 공모전', organizer: '과학기술정보통신부', category: ContestCategory.IDEA, tags: ['AI', '서비스', '개발'], scope: ContestScope.NATIONAL, minTeamSize: 1, maxTeamSize: 5, deadline: days(30), submitTo: '공모전 사무국' },
  ];
  for (const c of contests) {
    await prisma.contest.create({
      data: {
        ...c,
        description: `${c.title} 안내`,
        requiredDocuments: { create: defaultDocs.map((d, i) => ({ ...d, order: i })) },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
