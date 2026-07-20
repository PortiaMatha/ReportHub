import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const comment = await prisma.comment.update({
    where: { id },
    data: {
      author: body.author ?? null,
      text: body.text,
      date: body.date ? new Date(body.date) : undefined,
    },
  })
  return NextResponse.json(comment)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.comment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
