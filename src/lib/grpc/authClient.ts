import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.join(process.cwd(), "src/proto/auth.proto");
const HOST = process.env.GRPC_PRODUCT_HOST ?? "localhost:50051";

let _pkgDef: any = null;

function getClient() {
  // Don't cache the channel — reconnects cleanly after backend restarts
  if (!_pkgDef) {
    _pkgDef = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
  }
  const proto = grpc.loadPackageDefinition(_pkgDef) as any;
  return new proto.auth.AuthService(HOST, grpc.credentials.createInsecure());
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; expires_at: string }> {
  return new Promise((resolve, reject) => {
    getClient().Login({ username, password }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve({ token: res.token ?? "", expires_at: res.expires_at ?? "" });
    });
  });
}
