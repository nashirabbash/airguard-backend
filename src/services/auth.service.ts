import { db } from "../models/db";
import { errorMessage } from "../models/errorMessage";

// function check if user already exists
async function checkExistingUser(username: string) {
  const existingUser = await db.users.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new Error(errorMessage.USER_ALREADY_EXISTS);
  }
}

// function to hash password using bcrypt
function encryptPassword(password: string) {
  return Bun.password.hash(password, "bcrypt");
}

// function to create a new user in the database
async function createUser(username: string, password: string) {
  const user = await db.users.create({
    data: {
      username,
      password: await encryptPassword(password),
      createdAt: new Date(),
    },
  });
  return user;
}

// function to extract token from the Authorization header
function getTokenFromAuthorization(authorization?: string) {
  if (!authorization) {
    return;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() === "bearer" && token) {
    return token;
  }

  return authorization;
}

// function to find user by username
async function findUser(username: string) {
  return await db.users.findUnique({
    where: { username },
  });
}

// function to get user by credentials and verify password
async function getUserByCredentials(username: string, password: string) {
  const user = await findUser(username);

  if (!user || !(await verifyPassword(password, user.password))) {
    throw new Error(errorMessage.INVALID_CREDENTIALS);
  }

  return user;
}

// function to verify password using bcrypt
async function verifyPassword(password: string, passwordHash: string) {
  if (password === passwordHash) {
    return true;
  }

  try {
    return await Bun.password.verify(password, passwordHash);
  } catch {
    return false;
  }
}

// function to update the last login time of the user
async function updateLastLogin(userId: number) {
  await db.users.update({
    where: { id: userId },
    data: { lastLogin: new Date() },
  });
}

// function to revoke a token and remove it from the active tokens map
function revokeToken(
  authorization: string | undefined,
  activeTokens: Map<string, number>,
) {
  const token = getTokenFromAuthorization(authorization);

  if (!token || !activeTokens.delete(token)) {
    throw new Error(errorMessage.UNAUTHORIZED);
  }
}

// function to get authenticated user ID from the token and validate it against active tokens
function getAuthenticatedUserId(
  authorization: string | undefined,
  activeTokens: Map<string, number>,
) {
  const token = getTokenFromAuthorization(authorization);
  const userId = token ? activeTokens.get(token) : undefined;

  if (!token || !userId) {
    throw new Error(errorMessage.UNAUTHORIZED);
  }

  return { token, userId };
}

// function to get user data by user ID
async function getUserData(userId: number) {
  return await db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      lastLogin: true,
    },
  });
}

// function to handle missing authenticated user records
function handleMissingUser(token: string, activeTokens: Map<string, number>) {
  activeTokens.delete(token);
  throw new Error(errorMessage.UNAUTHORIZED);
}

// function to create and store an auth token for a user
function createAuthToken(userId: number, activeTokens: Map<string, number>) {
  const token = crypto.randomUUID();
  activeTokens.set(token, userId);
  return token;
}

// AuthService class to handle authentication-related operations such as sign-in, sign-out, sign-up, and retrieving user information
export class AuthService {
  // Map to store active tokens and their associated user IDs
  private static activeTokens = new Map<string, number>();

  // function to handle user sign-in, validate credentials, generate a token, and update last login time
  async signIn(username: string, password: string) {
    const user = await getUserByCredentials(username, password);

    const token = createAuthToken(user.id, AuthService.activeTokens);

    await updateLastLogin(user.id);

    const successResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    };
    return successResponse;
  }

  // function to handle user sign-out by revoking the token and removing it from the active tokens map
  async signOut(authorization?: string) {
    revokeToken(authorization, AuthService.activeTokens);

    return { success: true };
  }

  // function to handle user sign-up, check for existing user, create a new user, generate a token, and return the token in the response
  async signUp(username: string, password: string) {
    await checkExistingUser(username);

    const user = await createUser(username, password);
    const token = createAuthToken(user.id, AuthService.activeTokens);

    const successResponse = {
      token,
    };
    return successResponse;
  }

  // function to retrieve user information based on the provided token, validate the token against active tokens, and return user data
  async me(authorization?: string) {
    const { token, userId } = getAuthenticatedUserId(
      authorization,
      AuthService.activeTokens,
    );

    const user = await getUserData(userId);

    if (!user) {
      handleMissingUser(token, AuthService.activeTokens);
    }

    return user;
  }
}
