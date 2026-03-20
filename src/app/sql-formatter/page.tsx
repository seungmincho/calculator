import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import SqlFormatter from '@/components/SqlFormatter'

export const metadata: Metadata = {
  title: 'SQL 포맷터 - SQL 쿼리 포맷팅, 검증, 최적화 도구',
  description: 'SQL 쿼리를 읽기 좋게 포맷팅하거나 한 줄로 압축하세요. MySQL, PostgreSQL, SQLite 방언을 지원하며 문법 검증까지 제공합니다.',
  keywords: 'SQL포맷터, SQL검증, SQL예쁘게, SQL압축, SQL문법검사, 쿼리포맷터, 온라인SQL도구, 데이터베이스',
  openGraph: {
    title: 'SQL 포맷터 - SQL 쿼리 포맷팅, 검증',
    description: 'SQL 쿼리를 쉽게 포맷팅하고 검증하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/sql-formatter',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SQL 포맷터 - SQL 쿼리 포맷팅, 검증, 최적화 도구',
    description: 'SQL 쿼리를 읽기 좋게 포맷팅하거나 한 줄로 압축하세요. MySQL, PostgreSQL, SQLite 방언을 지원하며 문법 검증까지 제공합니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/sql-formatter/',
  },
}

export default function SqlFormatterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SQL 포맷터',
    description: 'SQL 쿼리를 읽기 좋게 포맷팅하거나 한 줄로 압축하세요. MySQL, PostgreSQL, SQLite 방언을 지원하며 문법 검증까지 제공합니다.',
    url: 'https://toolhub.ai.kr/sql-formatter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['SQL 구문 포맷팅', '다양한 SQL 방언 지원', '구문 강조', '들여쓰기 설정']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'SQL 포맷팅이 왜 중요한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SQL 포맷팅은 코드 가독성과 유지보수성을 크게 향상시킵니다. 들여쓰기된 SQL은 JOIN 관계, WHERE 조건, 서브쿼리 구조를 한눈에 파악할 수 있습니다. 팀 작업 시 일관된 포맷은 코드 리뷰를 효율적으로 만들고, 버그를 찾기 쉽게 합니다. 대부분의 회사에서 SQL 코딩 컨벤션을 정하고, 포맷터를 CI/CD에 통합합니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'SQL 방언(Dialect)이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SQL 방언은 데이터베이스 제품별 고유 문법과 기능을 말합니다. 표준 SQL(ANSI SQL)이 있지만, MySQL(LIMIT, IFNULL, backtick), PostgreSQL(SERIAL, ILIKE, ::캐스팅), Oracle(ROWNUM, NVL, CONNECT BY), SQL Server(TOP, ISNULL, [대괄호]) 등 각 DB마다 고유 구문이 있습니다. 포맷터에서 올바른 방언을 선택하면 해당 DB의 키워드를 정확히 인식합니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'SQL 성능 최적화 기본 팁은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① SELECT *을 피하고 필요한 컬럼만 선택 ② WHERE 절에 인덱스된 컬럼 사용 ③ JOIN 시 ON 조건에 인덱스 컬럼 활용 ④ 서브쿼리보다 JOIN이 보통 빠름 ⑤ LIKE \'%검색어\'는 인덱스를 사용하지 못함 ⑥ EXPLAIN으로 실행 계획 확인 ⑦ 대량 데이터는 페이지네이션(LIMIT/OFFSET) 적용. 포맷팅된 SQL은 이러한 성능 문제를 발견하기 더 쉽습니다.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <SqlFormatter />
      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            SQL 포맷터란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            SQL 포맷터는 복잡하고 읽기 어려운 SQL 쿼리를 들여쓰기와 줄 바꿈을 적용해 가독성 높게 정리하는 온라인 개발자 도구입니다. MySQL, PostgreSQL, Oracle, SQL Server 등 다양한 SQL 방언을 지원하며, 쿼리 압축(minify)과 문법 검증 기능도 제공합니다. 개발자, DBA, 데이터 분석가가 코드 리뷰나 쿼리 최적화 시 빠르게 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            SQL 포맷터 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>SQL 방언 선택:</strong> MySQL의 백틱(`)이나 PostgreSQL의 이중콜론(::) 캐스팅처럼 DB마다 고유 문법이 다르므로, 사용 중인 데이터베이스에 맞는 방언을 선택하세요.</li>
            <li><strong>들여쓰기 가독성:</strong> 포맷팅된 SQL은 JOIN 관계, WHERE 조건, 서브쿼리 구조를 한눈에 파악할 수 있어 코드 리뷰와 디버깅에 효과적입니다.</li>
            <li><strong>쿼리 압축(Minify):</strong> 프로그램에서 SQL을 문자열로 포함할 때 공백을 제거해 용량을 줄이거나, 로그에서 쿼리를 한 줄로 기록할 때 유용합니다.</li>
            <li><strong>성능 최적화 힌트:</strong> SELECT * 대신 필요한 컬럼만 선택하고, WHERE 절에 인덱스 컬럼을 사용하면 쿼리 실행 속도를 크게 향상시킬 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}