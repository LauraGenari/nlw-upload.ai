import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart"
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma";

// allow async/await in old node versions where were used callback instead
const pump = promisify(pipeline)

export async function uploadVideoRoute (app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25, // 25mb
        }
    });

    app.post('/videos', async (request, reply) => {
        const data = await request.file()
        // no data
        if(!data) {
            return reply.status(400).send({ error: 'Missing file input.' })
        }
        
        // wrong ext
        const extension = path.extname(data.filename)
        
        if (extension !== '.mp3') {
            return reply.status(400).send({ error: 'INvalid input type, please upload a MP3.' })
        }
        
        //duplicate names
        const fileBaseName = path.basename(data.filename, extension);
        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
        
        //dirname retornar ate routes
        const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

        // write while receiving
        await pump(data.file, fs.createWriteStream(uploadDestination));

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination,
            }
        })
        return {
            video,
        }
    });
}