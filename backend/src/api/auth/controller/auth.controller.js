import { registerUser, loginUser } from "../service/auth.service.js";

export const registerController = async (req, res, next) => {
  try {
    const data = await registerUser(req.body ?? {});
    res.status(201).json({ status: true, data });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (req, res, next) => {
  try {
    const data = await loginUser(req.body ?? {});
    res.status(200).json({ status: true, data });
  } catch (error) {
    next(error);
  }
};

export const meController = async (req, res) => {
  res.status(200).json({
    status: true,
    data: { id: req.user.id, name: req.user.name, email: req.user.email },
  });
};
