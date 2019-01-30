import { getUserGroup } from './getUserId.js'

export const getNewsParams = async ({prisma, session, search, category, orderBy}) => {
  const userGroup = await getUserGroup(prisma, session)
  const or = []
  if ( search ) or.push({title_contains: search}, {subtitle_contains: search}, {body_contains: search})

  const and = []
  if (userGroup.length) and.push({target_in: userGroup})
  if (category.length) and.push({category_in: category})

  const params = { where:{} }
  if (or.length) params.where.OR = or
  if (and.length) params.where.AND = and
  if (orderBy) params.orderBy = orderBy
  return params
}
