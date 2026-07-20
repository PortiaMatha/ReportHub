import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await prisma.comment.findMany({
    where: { clientId: id },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  if (!body.text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }
  const comment = await prisma.comment.create({
    data: {
      clientId: id,
      author: body.author || null,
      text: body.text,
      date: body.date ? new Date(body.date) : new Date(),
    },
  })
  return NextResponse.json(comment, { status: 201 })
}
