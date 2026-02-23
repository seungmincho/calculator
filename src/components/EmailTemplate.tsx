'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Mail, RotateCcw, FileText, Hash } from 'lucide-react'

// ── Types ──

type EmailCategory =
  | 'proposal'
  | 'thankYou'
  | 'apology'
  | 'meetingRequest'
  | 'quoteRequest'
  | 'collaboration'
  | 'complaint'
  | 'announcement'

type Tone = 'formal' | 'business' | 'friendly'
type EmailLang = 'ko' | 'en'

interface EmailFields {
  senderName: string
  recipientName: string
  companyName: string
  productName: string
  meetingDate: string
  meetingLocation: string
  apologyReason: string
  complaintDetail: string
  announcementContent: string
  deadline: string
  additionalNote: string
}

interface CategoryConfig {
  icon: string
  fields: (keyof EmailFields)[]
}

// ── Constants ──

const CATEGORY_CONFIGS: Record<EmailCategory, CategoryConfig> = {
  proposal: {
    icon: '💼',
    fields: ['senderName', 'recipientName', 'companyName', 'productName', 'additionalNote'],
  },
  thankYou: {
    icon: '🙏',
    fields: ['senderName', 'recipientName', 'companyName', 'additionalNote'],
  },
  apology: {
    icon: '😔',
    fields: ['senderName', 'recipientName', 'companyName', 'apologyReason', 'additionalNote'],
  },
  meetingRequest: {
    icon: '📅',
    fields: ['senderName', 'recipientName', 'companyName', 'meetingDate', 'meetingLocation', 'additionalNote'],
  },
  quoteRequest: {
    icon: '📋',
    fields: ['senderName', 'recipientName', 'companyName', 'productName', 'deadline', 'additionalNote'],
  },
  collaboration: {
    icon: '🤝',
    fields: ['senderName', 'recipientName', 'companyName', 'productName', 'additionalNote'],
  },
  complaint: {
    icon: '📢',
    fields: ['senderName', 'recipientName', 'companyName', 'complaintDetail', 'deadline', 'additionalNote'],
  },
  announcement: {
    icon: '📣',
    fields: ['senderName', 'companyName', 'announcementContent', 'deadline', 'additionalNote'],
  },
}

const CATEGORIES: EmailCategory[] = [
  'proposal',
  'thankYou',
  'apology',
  'meetingRequest',
  'quoteRequest',
  'collaboration',
  'complaint',
  'announcement',
]

const TONES: Tone[] = ['formal', 'business', 'friendly']

const INITIAL_FIELDS: EmailFields = {
  senderName: '',
  recipientName: '',
  companyName: '',
  productName: '',
  meetingDate: '',
  meetingLocation: '',
  apologyReason: '',
  complaintDetail: '',
  announcementContent: '',
  deadline: '',
  additionalNote: '',
}

// ── Template generators (Korean) ──

function generateKoProposal(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const product = f.productName || '[제품/서비스명]'
  const sender = f.senderName || '[보내는 사람]'
  const recipient = f.recipientName || '[받는 사람]'
  const company = f.companyName || '[회사명]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `${company} ${product} 관련 제안 드립니다`,
      body: `${recipient} 님께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n귀사의 발전에 진심으로 경의를 표하며, ${product} 관련하여 제안을 드리고자 연락드립니다.\n\n저희 ${company}에서는 ${product}을(를) 통해 귀사의 업무 효율성 향상과 비용 절감에 기여할 수 있을 것으로 확신합니다.\n\n자세한 내용은 별도 자료를 첨부해 드리겠습니다.\n검토 후 회신 부탁드리겠습니다.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `${product} 관련 제안 드려요 :)`,
      body: `${recipient} 님, 안녕하세요!\n\n${company}의 ${sender}입니다.\n혹시 ${product}에 관심 있으실까 해서 연락드렸어요.\n\n저희 쪽에서 좋은 조건으로 제안드릴 수 있을 것 같은데, 한번 이야기 나눠보면 좋겠습니다.\n\n편하신 시간에 연락 주시면 자세히 안내해 드릴게요!${note}\n\n좋은 하루 보내세요!\n${sender} 드림\n${company}`,
    }
  }
  // business
  return {
    subject: `[${company}] ${product} 관련 제안 안내`,
    body: `${recipient} 님께,\n\n안녕하세요, ${company}의 ${sender}입니다.\n${product} 관련하여 제안을 드리고자 합니다.\n\n저희 ${company}의 ${product}은(는) 귀사의 니즈에 적합한 솔루션을 제공할 수 있습니다.\n관련 상세 자료를 보내드릴 수 있으니, 검토 부탁드립니다.\n\n회신 부탁드리겠습니다.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
  }
}

function generateKoThankYou(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[보내는 사람]'
  const recipient = f.recipientName || '[받는 사람]'
  const company = f.companyName || '[회사명]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `${recipient} 님께 감사 인사 드립니다`,
      body: `${recipient} 님께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n바쁘신 와중에도 귀한 시간을 내어 주신 데 대해 깊이 감사드립니다.\n\n${recipient} 님의 도움 덕분에 업무를 원활히 진행할 수 있었습니다.\n앞으로도 좋은 관계를 이어갈 수 있기를 희망합니다.${note}\n\n다시 한번 진심으로 감사드립니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `감사합니다, ${recipient} 님!`,
      body: `${recipient} 님, 안녕하세요!\n\n${company}의 ${sender}입니다.\n지난번에 도움 주셔서 정말 감사해요!\n\n덕분에 일이 잘 마무리되었습니다.\n다음에 식사라도 한번 하면 좋겠습니다 :)${note}\n\n항상 감사합니다!\n${sender} 드림\n${company}`,
    }
  }
  return {
    subject: `감사 인사 드립니다 - ${company} ${sender}`,
    body: `${recipient} 님께,\n\n안녕하세요, ${company}의 ${sender}입니다.\n도움을 주신 데 대해 감사 인사를 드리고자 합니다.\n\n${recipient} 님의 지원 덕분에 순조롭게 진행할 수 있었습니다.\n앞으로도 좋은 협력 관계 이어가겠습니다.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
  }
}

function generateKoApology(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[보내는 사람]'
  const recipient = f.recipientName || '[받는 사람]'
  const company = f.companyName || '[회사명]'
  const reason = f.apologyReason || '[사과 사유]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `${reason} 관련 진심으로 사과드립니다`,
      body: `${recipient} 님께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n${reason}으로 인해 불편을 끼쳐드린 점 진심으로 사과드립니다.\n\n향후 이러한 일이 재발하지 않도록 만전을 기하겠습니다.\n재발 방지를 위한 구체적인 조치를 마련하여 별도로 안내해 드리겠습니다.${note}\n\n다시 한번 깊이 사과드리며, 양해 부탁드립니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `죄송합니다, ${recipient} 님`,
      body: `${recipient} 님, 안녕하세요.\n\n${company}의 ${sender}입니다.\n${reason} 건으로 불편을 드려서 정말 죄송합니다.\n\n같은 일이 반복되지 않도록 꼭 개선하겠습니다.\n혹시 추가로 불편한 점이 있으시면 편하게 말씀해 주세요.${note}\n\n다시 한번 죄송합니다.\n${sender} 드림\n${company}`,
    }
  }
  return {
    subject: `[사과] ${reason} 관련 안내`,
    body: `${recipient} 님께,\n\n안녕하세요, ${company}의 ${sender}입니다.\n${reason}으로 인해 불편을 드린 점 사과드립니다.\n\n현재 원인을 파악하고 재발 방지 대책을 수립 중에 있습니다.\n빠른 시일 내에 정상화될 수 있도록 최선을 다하겠습니다.${note}\n\n양해 부탁드립니다.\n${sender} 드림\n${company}`,
  }
}

function generateKoMeetingRequest(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[보내는 사람]'
  const recipient = f.recipientName || '[받는 사람]'
  const company = f.companyName || '[회사명]'
  const date = f.meetingDate || '[회의 일시]'
  const location = f.meetingLocation || '[회의 장소/방법]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `회의 요청 드립니다 - ${date}`,
      body: `${recipient} 님께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n업무 관련 논의 사항이 있어 회의를 요청드립니다.\n\n- 일시: ${date}\n- 장소/방법: ${location}\n\n바쁘신 일정에 양해를 구하며, 참석 가능 여부를 회신해 주시면 감사하겠습니다.\n시간 조율이 필요하시면 편한 시간을 알려 주십시오.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `회의 가능하실까요? - ${date}`,
      body: `${recipient} 님, 안녕하세요!\n\n${company}의 ${sender}입니다.\n논의드릴 사항이 있어서요. 혹시 아래 일정에 시간 괜찮으실까요?\n\n- 일시: ${date}\n- 장소/방법: ${location}\n\n시간이 어려우시면 다른 시간도 괜찮으니 편하게 말씀해 주세요!${note}\n\n좋은 하루 보내세요!\n${sender} 드림\n${company}`,
    }
  }
  return {
    subject: `[회의 요청] ${date} 미팅 가능 여부 확인`,
    body: `${recipient} 님께,\n\n안녕하세요, ${company}의 ${sender}입니다.\n업무 관련 미팅을 요청드립니다.\n\n- 일시: ${date}\n- 장소/방법: ${location}\n\n참석 가능 여부를 회신해 주시면 감사하겠습니다.\n일정 조율이 필요하시면 말씀해 주세요.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
  }
}

function generateKoQuoteRequest(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[보내는 사람]'
  const recipient = f.recipientName || '[받는 사람]'
  const company = f.companyName || '[회사명]'
  const product = f.productName || '[제품/서비스명]'
  const deadline = f.deadline ? `\n- 회신 기한: ${f.deadline}` : ''
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `${product} 견적 요청 드립니다`,
      body: `${recipient} 님께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n${product} 관련하여 견적을 요청드리고자 합니다.\n\n아래 사항을 포함하여 견적서를 보내주시면 감사하겠습니다.\n- 단가 및 수량별 할인 조건\n- 납기일\n- 결제 조건${deadline}\n\n검토 후 빠른 회신 부탁드립니다.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `${product} 견적 문의드려요`,
      body: `${recipient} 님, 안녕하세요!\n\n${company}의 ${sender}입니다.\n${product} 가격이 궁금해서 견적 문의드립니다.\n\n대략적인 단가와 납기일 알려주시면 검토해 볼게요!${deadline ? `\n${deadline.trim()}까지 회신 주시면 좋겠습니다.` : ''}${note}\n\n감사합니다!\n${sender} 드림\n${company}`,
    }
  }
  return {
    subject: `[견적 요청] ${product} 견적 안내 부탁드립니다`,
    body: `${recipient} 님께,\n\n안녕하세요, ${company}의 ${sender}입니다.\n${product}에 대한 견적을 요청드립니다.\n\n포함 사항:\n- 단가 및 수량 조건\n- 납기일 및 결제 조건${deadline}\n\n회신 부탁드립니다.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
  }
}

function generateKoCollaboration(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[보내는 사람]'
  const recipient = f.recipientName || '[받는 사람]'
  const company = f.companyName || '[회사명]'
  const product = f.productName || '[협업 분야/프로젝트명]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `${product} 관련 협업 제안 드립니다`,
      body: `${recipient} 님께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n귀사의 우수한 역량에 깊은 감명을 받아 ${product} 관련 협업을 제안드리고자 합니다.\n\n양사의 강점을 결합한다면 시너지 효과를 극대화할 수 있을 것으로 기대합니다.\n구체적인 협업 방안에 대해 논의할 기회를 갖고 싶습니다.\n\n검토 후 회신 부탁드리겠습니다.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `같이 협업해 보면 어떨까요?`,
      body: `${recipient} 님, 안녕하세요!\n\n${company}의 ${sender}입니다.\n${product} 쪽으로 같이 해볼 만한 게 있을 것 같아서 연락드렸어요.\n\n서로 윈윈할 수 있는 좋은 기회가 될 것 같은데, 한번 이야기 나눠보면 좋겠습니다!\n편하신 시간에 커피 한잔 하면서 이야기해요 :)${note}\n\n좋은 하루 보내세요!\n${sender} 드림\n${company}`,
    }
  }
  return {
    subject: `[협업 제안] ${product} 관련 파트너십 논의`,
    body: `${recipient} 님께,\n\n안녕하세요, ${company}의 ${sender}입니다.\n${product} 관련하여 협업을 제안드립니다.\n\n양사의 역량을 결합하면 좋은 결과를 낼 수 있을 것으로 생각합니다.\n자세한 논의를 위해 미팅을 제안드립니다.${note}\n\n회신 부탁드립니다.\n${sender} 드림\n${company}`,
  }
}

function generateKoComplaint(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[보내는 사람]'
  const recipient = f.recipientName || '[담당자]'
  const company = f.companyName || '[회사명]'
  const detail = f.complaintDetail || '[불만 내용]'
  const deadline = f.deadline ? `\n\n${f.deadline}까지 회신을 요청드립니다.` : ''
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `서비스 관련 불만 사항 접수`,
      body: `${recipient} 님께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n다음 사항에 대해 불만을 접수하고자 합니다.\n\n[불만 내용]\n${detail}\n\n상기 사안에 대한 신속한 조치와 개선 방안을 요청드립니다.${deadline}${note}\n\n조속한 처리 부탁드립니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `이용 중 불편 사항 안내드려요`,
      body: `${recipient} 님, 안녕하세요.\n\n${company}의 ${sender}입니다.\n이용하면서 좀 불편한 점이 있어서 말씀드리려고요.\n\n${detail}\n\n개선해 주시면 더 좋은 서비스가 될 것 같습니다.${deadline}${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
    }
  }
  return {
    subject: `[불만 접수] 서비스 개선 요청`,
    body: `${recipient} 님께,\n\n안녕하세요, ${company}의 ${sender}입니다.\n아래 불만 사항을 접수합니다.\n\n[불만 내용]\n${detail}\n\n빠른 시일 내 개선 조치를 부탁드립니다.${deadline}${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
  }
}

function generateKoAnnouncement(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[보내는 사람]'
  const company = f.companyName || '[회사명]'
  const content = f.announcementContent || '[공지 내용]'
  const deadline = f.deadline ? `\n\n적용일: ${f.deadline}` : ''
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `[공지] ${company} 안내 사항`,
      body: `관계자 여러분께,\n\n안녕하십니까, ${company}의 ${sender}입니다.\n다음과 같이 안내 사항을 공지드립니다.\n\n[안내 내용]\n${content}${deadline}\n\n문의 사항이 있으시면 연락 주시기 바랍니다.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `공지 안내드려요!`,
      body: `안녕하세요, ${company}의 ${sender}입니다.\n\n안내드릴 사항이 있어서 공지드립니다.\n\n${content}${deadline}\n\n궁금한 점 있으시면 편하게 연락 주세요!${note}\n\n감사합니다!\n${sender} 드림\n${company}`,
    }
  }
  return {
    subject: `[안내] ${company} 공지사항`,
    body: `안녕하세요, ${company}의 ${sender}입니다.\n\n아래와 같이 안내드립니다.\n\n[안내 내용]\n${content}${deadline}\n\n문의 사항은 회신으로 알려주세요.${note}\n\n감사합니다.\n${sender} 드림\n${company}`,
  }
}

// ── Template generators (English) ──

function generateEnProposal(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const product = f.productName || '[Product/Service]'
  const sender = f.senderName || '[Sender]'
  const recipient = f.recipientName || '[Recipient]'
  const company = f.companyName || '[Company]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `Business Proposal: ${product} from ${company}`,
      body: `Dear ${recipient},\n\nI hope this message finds you well. My name is ${sender} from ${company}.\n\nI am writing to present a proposal regarding ${product}. We believe our solution can significantly enhance your operations and deliver measurable value.\n\nI would be delighted to provide detailed materials for your review.\nPlease let me know if you would be available to discuss this further.${note}\n\nSincerely,\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Quick idea about ${product}!`,
      body: `Hi ${recipient}!\n\nThis is ${sender} from ${company}.\nI wanted to reach out about ${product} - I think it could be a great fit for you!\n\nWould love to chat about it whenever you have a moment.${note}\n\nBest,\n${sender}\n${company}`,
    }
  }
  return {
    subject: `[${company}] ${product} Proposal`,
    body: `Dear ${recipient},\n\nI'm ${sender} from ${company}. I'd like to present a proposal regarding ${product}.\n\nOur solution is designed to meet your needs effectively. I'd be happy to share detailed information at your convenience.\n\nPlease let me know your thoughts.${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

function generateEnThankYou(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[Sender]'
  const recipient = f.recipientName || '[Recipient]'
  const company = f.companyName || '[Company]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `A Sincere Thank You, ${recipient}`,
      body: `Dear ${recipient},\n\nI hope this message finds you well. I am writing on behalf of ${company} to express our sincere gratitude for your generous support.\n\nYour assistance has been invaluable, and we truly appreciate your time and effort.\nWe look forward to continuing our productive relationship.${note}\n\nWith deepest appreciation,\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Thank you so much, ${recipient}!`,
      body: `Hi ${recipient}!\n\nJust wanted to say a big thank you! Your help meant a lot.\nEverything worked out great thanks to you.\n\nLet's grab coffee sometime soon!${note}\n\nThanks again!\n${sender}\n${company}`,
    }
  }
  return {
    subject: `Thank You - ${company}`,
    body: `Dear ${recipient},\n\nI'm ${sender} from ${company}. I wanted to take a moment to thank you for your support.\n\nYour help made a real difference, and I appreciate it greatly.\nLooking forward to working together again.${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

function generateEnApology(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[Sender]'
  const recipient = f.recipientName || '[Recipient]'
  const company = f.companyName || '[Company]'
  const reason = f.apologyReason || '[reason for apology]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `Our Sincere Apology Regarding ${reason}`,
      body: `Dear ${recipient},\n\nOn behalf of ${company}, I sincerely apologize for the inconvenience caused by ${reason}.\n\nWe take this matter very seriously and are implementing measures to ensure it does not recur.\nWe will provide a detailed action plan shortly.${note}\n\nPlease accept our deepest apologies.\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Sorry about that, ${recipient}`,
      body: `Hi ${recipient},\n\nI'm really sorry about ${reason}. That wasn't the experience we wanted you to have.\n\nWe're working on fixing this right away. Please don't hesitate to reach out if there's anything else.${note}\n\nSorry again!\n${sender}\n${company}`,
    }
  }
  return {
    subject: `[Apology] Regarding ${reason}`,
    body: `Dear ${recipient},\n\nI'm ${sender} from ${company}. I apologize for the issue regarding ${reason}.\n\nWe're investigating the cause and taking corrective action to prevent recurrence.\nWe appreciate your patience and understanding.${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

function generateEnMeetingRequest(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[Sender]'
  const recipient = f.recipientName || '[Recipient]'
  const company = f.companyName || '[Company]'
  const date = f.meetingDate || '[Date/Time]'
  const location = f.meetingLocation || '[Location/Method]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `Meeting Request - ${date}`,
      body: `Dear ${recipient},\n\nI am writing to request a meeting to discuss matters of mutual interest.\n\n- Date/Time: ${date}\n- Location/Method: ${location}\n\nKindly confirm your availability at your earliest convenience.\nShould the proposed time not work for you, please suggest an alternative.${note}\n\nThank you for your consideration.\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Can we meet on ${date}?`,
      body: `Hi ${recipient}!\n\nI'd love to catch up and discuss a few things. How does this work for you?\n\n- When: ${date}\n- Where: ${location}\n\nIf that doesn't work, just let me know what does!${note}\n\nCheers,\n${sender}\n${company}`,
    }
  }
  return {
    subject: `[Meeting Request] ${date}`,
    body: `Dear ${recipient},\n\nI'm ${sender} from ${company}. I'd like to schedule a meeting.\n\n- Date/Time: ${date}\n- Location/Method: ${location}\n\nPlease confirm your availability.${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

function generateEnQuoteRequest(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[Sender]'
  const recipient = f.recipientName || '[Recipient]'
  const company = f.companyName || '[Company]'
  const product = f.productName || '[Product/Service]'
  const deadline = f.deadline ? `\n- Response by: ${f.deadline}` : ''
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `Request for Quotation: ${product}`,
      body: `Dear ${recipient},\n\nI am writing on behalf of ${company} to request a formal quotation for ${product}.\n\nPlease include the following in your quote:\n- Unit pricing and volume discounts\n- Delivery timeline\n- Payment terms${deadline}\n\nWe look forward to your prompt response.${note}\n\nSincerely,\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Quick quote request for ${product}`,
      body: `Hi ${recipient}!\n\nI'm ${sender} from ${company}. We're interested in ${product} and would love to get a quote.\n\nCould you send over pricing and timeline info?${deadline ? `\nIdeally by ${f.deadline} if possible!` : ''}${note}\n\nThanks a lot!\n${sender}\n${company}`,
    }
  }
  return {
    subject: `[Quote Request] ${product}`,
    body: `Dear ${recipient},\n\nI'm ${sender} from ${company}. We'd like to request a quote for ${product}.\n\nPlease include:\n- Pricing and volume conditions\n- Delivery and payment terms${deadline}\n\nThank you.${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

function generateEnCollaboration(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[Sender]'
  const recipient = f.recipientName || '[Recipient]'
  const company = f.companyName || '[Company]'
  const product = f.productName || '[Project/Area]'
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `Collaboration Proposal: ${product}`,
      body: `Dear ${recipient},\n\nI am ${sender} from ${company}. We have been deeply impressed by your work and would like to propose a collaboration regarding ${product}.\n\nWe believe that combining our respective strengths would create significant synergy and mutual benefit.\nI would welcome the opportunity to discuss this further at your convenience.${note}\n\nSincerely,\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Let's team up on ${product}!`,
      body: `Hi ${recipient}!\n\nI'm ${sender} from ${company}. I think there's a great opportunity for us to collaborate on ${product}!\n\nIt could be a win-win for both of us. Let's chat about it over coffee sometime!${note}\n\nLooking forward to it!\n${sender}\n${company}`,
    }
  }
  return {
    subject: `[Partnership] ${product} Collaboration Proposal`,
    body: `Dear ${recipient},\n\nI'm ${sender} from ${company}. I'd like to propose a collaboration on ${product}.\n\nI believe a partnership would benefit both organizations. I'd love to set up a meeting to discuss the details.${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

function generateEnComplaint(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[Sender]'
  const recipient = f.recipientName || '[Contact Person]'
  const company = f.companyName || '[Company]'
  const detail = f.complaintDetail || '[complaint details]'
  const deadline = f.deadline ? `\n\nWe request a response by ${f.deadline}.` : ''
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `Formal Complaint - Service Issue`,
      body: `Dear ${recipient},\n\nI am writing on behalf of ${company} to formally raise the following complaint.\n\n[Issue Details]\n${detail}\n\nWe request prompt attention to this matter and a concrete plan for resolution.${deadline}${note}\n\nThank you for your immediate attention.\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Feedback on recent experience`,
      body: `Hi ${recipient},\n\nI'm ${sender} from ${company}. I wanted to share some feedback about an issue we encountered.\n\n${detail}\n\nIt would be great if this could be looked into.${deadline}${note}\n\nThanks for listening!\n${sender}\n${company}`,
    }
  }
  return {
    subject: `[Complaint] Service Improvement Request`,
    body: `Dear ${recipient},\n\nI'm ${sender} from ${company}. I'm writing to file a complaint regarding the following:\n\n[Issue Details]\n${detail}\n\nWe kindly request a timely resolution.${deadline}${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

function generateEnAnnouncement(f: EmailFields, tone: Tone): { subject: string; body: string } {
  const sender = f.senderName || '[Sender]'
  const company = f.companyName || '[Company]'
  const content = f.announcementContent || '[announcement content]'
  const deadline = f.deadline ? `\n\nEffective date: ${f.deadline}` : ''
  const note = f.additionalNote ? `\n\n${f.additionalNote}` : ''

  if (tone === 'formal') {
    return {
      subject: `[Announcement] Important Notice from ${company}`,
      body: `Dear Colleagues,\n\nI am writing to inform you of the following important update from ${company}.\n\n[Announcement]\n${content}${deadline}\n\nShould you have any questions, please do not hesitate to reach out.${note}\n\nSincerely,\n${sender}\n${company}`,
    }
  }
  if (tone === 'friendly') {
    return {
      subject: `Heads up! Update from ${company}`,
      body: `Hey everyone!\n\nThis is ${sender} from ${company}. Just wanted to share a quick update.\n\n${content}${deadline}\n\nFeel free to reach out if you have any questions!${note}\n\nCheers,\n${sender}\n${company}`,
    }
  }
  return {
    subject: `[Notice] ${company} Announcement`,
    body: `Hello,\n\nThis is ${sender} from ${company}. Please see the announcement below.\n\n[Details]\n${content}${deadline}\n\nFor questions, please reply to this email.${note}\n\nBest regards,\n${sender}\n${company}`,
  }
}

// ── Generator map ──

type GeneratorFn = (fields: EmailFields, tone: Tone) => { subject: string; body: string }

const KO_GENERATORS: Record<EmailCategory, GeneratorFn> = {
  proposal: generateKoProposal,
  thankYou: generateKoThankYou,
  apology: generateKoApology,
  meetingRequest: generateKoMeetingRequest,
  quoteRequest: generateKoQuoteRequest,
  collaboration: generateKoCollaboration,
  complaint: generateKoComplaint,
  announcement: generateKoAnnouncement,
}

const EN_GENERATORS: Record<EmailCategory, GeneratorFn> = {
  proposal: generateEnProposal,
  thankYou: generateEnThankYou,
  apology: generateEnApology,
  meetingRequest: generateEnMeetingRequest,
  quoteRequest: generateEnQuoteRequest,
  collaboration: generateEnCollaboration,
  complaint: generateEnComplaint,
  announcement: generateEnAnnouncement,
}

// ── Component ──

export default function EmailTemplate() {
  const t = useTranslations('emailTemplate')

  const [category, setCategory] = useState<EmailCategory>('proposal')
  const [tone, setTone] = useState<Tone>('business')
  const [emailLang, setEmailLang] = useState<EmailLang>('ko')
  const [fields, setFields] = useState<EmailFields>({ ...INITIAL_FIELDS })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const updateField = useCallback((key: keyof EmailFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleCategoryChange = useCallback((cat: EmailCategory) => {
    setCategory(cat)
  }, [])

  const resetFields = useCallback(() => {
    setFields({ ...INITIAL_FIELDS })
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const generated = useMemo(() => {
    const generators = emailLang === 'ko' ? KO_GENERATORS : EN_GENERATORS
    return generators[category](fields, tone)
  }, [category, tone, emailLang, fields])

  const fullEmail = useMemo(() => {
    return `${generated.subject}\n\n${generated.body}`
  }, [generated])

  const wordCount = useMemo(() => {
    const text = generated.body
    const chars = text.length
    const words = text.split(/\s+/).filter(Boolean).length
    const lines = text.split('\n').length
    return { chars, words, lines }
  }, [generated.body])

  const activeFields = CATEGORY_CONFIGS[category].fields

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Category selector */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('categoryTitle')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`text-left transition-all ${
                category === cat
                  ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4'
                  : 'border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4 cursor-pointer hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-1">{CATEGORY_CONFIGS[cat].icon}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {t(`categories.${cat}`)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main grid: form + preview */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left panel: settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tone & Language */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('settings')}</h3>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('toneLabel')}
              </label>
              <div className="flex gap-2">
                {TONES.map(t_tone => (
                  <button
                    key={t_tone}
                    onClick={() => setTone(t_tone)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      tone === t_tone
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t(`tones.${t_tone}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('languageLabel')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEmailLang('ko')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    emailLang === 'ko'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('languages.ko')}
                </button>
                <button
                  onClick={() => setEmailLang('en')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    emailLang === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('languages.en')}
                </button>
              </div>
            </div>
          </div>

          {/* Input fields */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('fieldsTitle')}</h3>
              <button
                onClick={resetFields}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label={t('reset')}
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
            </div>

            {activeFields.map(fieldKey => (
              <div key={fieldKey}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t(`fields.${fieldKey}`)}
                </label>
                {fieldKey === 'complaintDetail' ||
                fieldKey === 'announcementContent' ||
                fieldKey === 'additionalNote' ? (
                  <textarea
                    value={fields[fieldKey]}
                    onChange={e => updateField(fieldKey, e.target.value)}
                    rows={3}
                    placeholder={t(`placeholders.${fieldKey}`)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  />
                ) : (
                  <input
                    type={fieldKey === 'meetingDate' ? 'text' : 'text'}
                    value={fields[fieldKey]}
                    onChange={e => updateField(fieldKey, e.target.value)}
                    placeholder={t(`placeholders.${fieldKey}`)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {t('preview')}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Hash className="w-4 h-4" />
                <span>{t('stats.chars', { count: wordCount.chars })}</span>
                <span className="mx-1">|</span>
                <span>{t('stats.words', { count: wordCount.words })}</span>
                <span className="mx-1">|</span>
                <span>{t('stats.lines', { count: wordCount.lines })}</span>
              </div>
            </div>

            {/* Email preview */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              {/* Subject */}
              <div className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                {generated.subject}
              </div>
              {/* Body */}
              <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">
                {generated.body}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => copyToClipboard(fullEmail, 'full')}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all text-sm"
              >
                {copiedId === 'full' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedId === 'full' ? t('copied') : t('copyAll')}
              </button>
              <button
                onClick={() => copyToClipboard(generated.subject, 'subject')}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
              >
                {copiedId === 'subject' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedId === 'subject' ? t('copied') : t('copySubject')}
              </button>
              <button
                onClick={() => copyToClipboard(generated.body, 'body')}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 font-medium transition-colors text-sm"
              >
                {copiedId === 'body' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedId === 'body' ? t('copied') : t('copyBody')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tipsTitle')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips') as string[]).map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.etiquetteTitle')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.etiquette') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
