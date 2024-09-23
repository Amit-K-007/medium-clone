import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign } from 'hono/jwt'
import { signupInput, signinInput } from '@amit-k/medium-common';

type Bindings = {
    DATABASE_URL: string,
    JWT_SECRET: string,
}
export const userRouter = new Hono<{Bindings: Bindings}>();

userRouter.post('/signup', async (c) => {
    const body = await c.req.json();
    const { success } = signupInput.safeParse(body);

    if (!success) {
      return c.json({
        error: "Input Validation Failed",
      }, 411);
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try{
        const userId = await prisma.user.create({
            data: {
                name: body.name,
                email: body.email,
                password: body.password,
            },
            select: {
                id: true,
            },
        });
        const token = await sign(userId, c.env.JWT_SECRET);
    
        return c.json({
            token: "Bearer " + token,
        });
    }
    catch(e){
        return c.json({
            error: "Error While Signing Up",
        });
    }
});

userRouter.post('/signin', async (c) => {
    const body = await c.req.json();
    const { success } = signinInput.safeParse(body);

    if (!success) {
      return c.json({
        error: "Input Validation Failed",
      }, 411);
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try{
        const user = await prisma.user.findUnique({
            where: {
                email: body.email,
            }
        });
        if (!user) {
            return c.json({
              error: "User not found",
            }, 403);
        };
        if (user.password !== body.password) {
            return c.json({
              error: "Invalid Password",
            }, 403);
        };

        const token = await sign({id: user.id}, c.env.JWT_SECRET);
    
        return c.json({
            token: "Bearer " + token,
        });
    }
    catch(e){
        return c.json({
            error: "Error While Signing In",
        });
    }
});