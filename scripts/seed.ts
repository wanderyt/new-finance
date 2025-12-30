import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../app/lib/db/schema'
import path from 'path'

const sqlite = new Database(path.join(process.cwd(), 'db', 'finance.db'))
const db = drizzle(sqlite, { schema })

async function main() {
  console.log('🌱 Seeding database...')

  try {
    // Insert demo user
    await db.insert(schema.users).values({
      username: 'demo',
      password: 'demo123', // TODO: Hash with bcrypt in production
    }).onConflictDoNothing()

    console.log('✅ Demo user created (username: demo, password: demo123)')

    // Verify the user was created
    const users = await db.select().from(schema.users)
    console.log('📊 Users in database:', users)

    // Get the demo user ID
    const demoUser = users.find(u => u.username === 'demo')
    if (demoUser) {
      // Insert persons for the demo user
      await db.insert(schema.persons).values([
        {
          userId: demoUser.userId,
          name: 'Robin',
          isDefault: false,
          isActive: true,
        },
        {
          userId: demoUser.userId,
          name: 'David',
          isDefault: true,
          isActive: true,
        },
        {
          userId: demoUser.userId,
          name: 'Lily',
          isDefault: false,
          isActive: true,
        },
        {
          userId: demoUser.userId,
          name: 'Luna',
          isDefault: false,
          isActive: true,
        },
      ]).onConflictDoNothing()

      console.log('✅ Persons created (Robin, David [default], Lily, Luna)')

      // Verify persons were created
      const persons = await db.select().from(schema.persons)
      console.log('📊 Persons in database:', persons)

      // Insert categories for the demo user
      const categoryData = [
        // 周中 (Weekday)
        { category: '周中', subcategory: '早餐' },
        { category: '周中', subcategory: '午餐' },
        { category: '周中', subcategory: '晚餐' },
        { category: '周中', subcategory: '甜点' },
        { category: '周中', subcategory: '零食' },
        // 周末 (Weekend)
        { category: '周末', subcategory: '早餐' },
        { category: '周末', subcategory: '午餐' },
        { category: '周末', subcategory: '晚餐' },
        { category: '周末', subcategory: '零食' },
        { category: '周末', subcategory: '下午茶' },
        // 骐骐 (Qiqi)
        { category: '骐骐', subcategory: '衣服' },
        { category: '骐骐', subcategory: '鞋子' },
        { category: '骐骐', subcategory: '医药' },
        { category: '骐骐', subcategory: '生活用品' },
        { category: '骐骐', subcategory: '餐饮' },
        { category: '骐骐', subcategory: '玩具' },
        { category: '骐骐', subcategory: '娱乐' },
        { category: '骐骐', subcategory: '教育' },
        // 慢慢 (Manman)
        { category: '慢慢', subcategory: '衣服' },
        { category: '慢慢', subcategory: '鞋子' },
        { category: '慢慢', subcategory: '医药' },
        { category: '慢慢', subcategory: '生活用品' },
        { category: '慢慢', subcategory: '餐饮' },
        { category: '慢慢', subcategory: '玩具' },
        { category: '慢慢', subcategory: '娱乐' },
        { category: '慢慢', subcategory: '教育' },
        // 旅游 (Travel)
        { category: '旅游', subcategory: '材料' },
        { category: '旅游', subcategory: '住宿' },
        { category: '旅游', subcategory: '交通' },
        { category: '旅游', subcategory: '餐饮' },
        { category: '旅游', subcategory: '门票' },
        { category: '旅游', subcategory: '纪念品' },
        { category: '旅游', subcategory: '生活用品' },
        { category: '旅游', subcategory: '娱乐' },
        // 汽车周边 (Car)
        { category: '汽车周边', subcategory: '保养' },
        { category: '汽车周边', subcategory: '燃油' },
        { category: '汽车周边', subcategory: '车载饰物' },
        { category: '汽车周边', subcategory: '停车费' },
        { category: '汽车周边', subcategory: '路费' },
        { category: '汽车周边', subcategory: '罚款' },
        { category: '汽车周边', subcategory: '保险' },
        { category: '汽车周边', subcategory: '证件' },
        { category: '汽车周边', subcategory: '修车' },
        // 生活 (Life)
        { category: '生活', subcategory: '生活用品' },
        { category: '生活', subcategory: '零食' },
        { category: '生活', subcategory: '化妆品' },
        { category: '生活', subcategory: '衣服' },
        { category: '生活', subcategory: '鞋子' },
        { category: '生活', subcategory: '出行' },
        { category: '生活', subcategory: '通讯' },
        { category: '生活', subcategory: '买菜原料' },
        { category: '生活', subcategory: '水电煤气' },
        { category: '生活', subcategory: '医药' },
        { category: '生活', subcategory: '水果' },
        { category: '生活', subcategory: '工作杂项' },
        { category: '生活', subcategory: '娱乐' },
        { category: '生活', subcategory: '音乐' },
        { category: '生活', subcategory: '学习' },
        { category: '生活', subcategory: '日常开销' },
        { category: '生活', subcategory: '健身' },
        { category: '生活', subcategory: '配饰' },
        { category: '生活', subcategory: '内衣' },
        { category: '生活', subcategory: '书' },
        { category: '生活', subcategory: '礼物' },
        // 居家 (Home)
        { category: '居家', subcategory: '家政服务' },
        { category: '居家', subcategory: '房款房贷' },
        { category: '居家', subcategory: '美容美发' },
        // 交通 (Transportation)
        { category: '交通', subcategory: '地铁' },
        { category: '交通', subcategory: '打车' },
        { category: '交通', subcategory: '火车' },
        { category: '交通', subcategory: '船舶' },
        // 医教 (Medical & Education)
        { category: '医教', subcategory: '挂号门诊' },
        { category: '医教', subcategory: '医疗药品' },
        // 节假日 (Holidays)
        { category: '节假日', subcategory: '餐饮' },
        { category: '节假日', subcategory: '出行' },
        { category: '节假日', subcategory: '纪念品' },
        { category: '节假日', subcategory: '住宿' },
        { category: '节假日', subcategory: '杂项' },
        // 社交 (Social)
        { category: '社交', subcategory: '交通' },
        { category: '社交', subcategory: '红包' },
        { category: '社交', subcategory: '礼物' },
        { category: '社交', subcategory: '住宿' },
        { category: '社交', subcategory: '杂项' },
      ]

      await db.insert(schema.categories).values(
        categoryData.map(cat => ({
          userId: demoUser.userId,
          category: cat.category,
          subcategory: cat.subcategory,
          appliesTo: 'expense',
          isCommon: false,
        }))
      ).onConflictDoNothing()

      console.log('✅ Categories created (83 expense categories)')

      // Verify categories were created
      const categories = await db.select().from(schema.categories)
      console.log('📊 Categories in database:', categories.length, 'total')
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    sqlite.close()
  }
}

main()
  .then(() => {
    console.log('✅ Seeding completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
