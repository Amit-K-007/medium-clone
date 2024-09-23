import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { verify } from 'hono/jwt';
import { createBlogInput, updateBlogInput } from '@amit-k/medium-common';

type Bindings = {
    DATABASE_URL: string,
    JWT_SECRET: string,
}
type Variables = {
    userId: string;
};

export const blogRouter = new Hono<{Bindings: Bindings; Variables: Variables}>();

blogRouter.use("/*", async (c, next) => {
    const jwt = c.req.header("Authorization");
    if(!jwt) {
        return c.json({
        error: "Unauthorized",
        }, 401);
    }
    try{
        const token = jwt.split(" ")[1];
        const payload = await verify(token, c.env.JWT_SECRET);
        c.set("userId", payload.id as string);
        await next();
    }catch(err) {
        return c.json({
        error: "Unauthorized",
        }, 401);
    }
});

blogRouter.post('/', async (c) => {
    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);
    if (!success) {
      return c.json({
        error: "Input Validation Failed",
      }, 411);
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    
    try{
        const blog = await prisma.post.create({
            data: {
                title: body.title,
                content: body.content,
                authorId: c.get("userId"),
            }
        })
        return c.json(blog);
    }
    catch(e){
        return c.json({
            error: "Error occured",
        });
    }
});

blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
    if (!success) {
      return c.json({
        error: "Input Validation Failed",
      }, 411);
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    
    try{
        const blog = await prisma.post.update({
            where: {
                id: body.id,
            },
            data: {
                title: body.title,
                content: body.content,
            },
        });
        return c.json(blog);
    }
    catch(e){
        return c.json({
            error: "Error occured",
        });
    }
});

blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    
    try{
        const blogs = await prisma.post.findMany({
            select: {
                title: true,
                content: true,
                id: true,
                author: {
                    select: {
                        name: true,
                    }
                },
            },
        });
        return c.json({
            blogs
        });
    }
    catch(e){
        return c.json({
            error: "Error while fetching blogs",
        });
    }
});

blogRouter.get('/:id', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    
    try{
        const blog = await prisma.post.findFirst({
            where: {
                id: c.req.param("id"),
            },
            select: {
                title: true,
                content: true,
                id: true,
                author: {
                    select: {
                        name: true,
                    }
                },
            },
        })
        return c.json(blog);
    }
    catch(e){
        return c.json({
            error: "Error occured",
        });
    }
});


